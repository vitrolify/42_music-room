import logging

from pydantic import ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue
from app.models.playlist import Playlist
from app.models.playlist_track import PlaylistTrack
from app.schemas.event import MoveEventPayload

logger = logging.getLogger(__name__)


async def process_move_track(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:
    try:
        payload = MoveEventPayload.model_validate(event.payload)
    except ValidationError as e:
        logger.error(
            {
                "event": "worker_move_failed",
                "reason": "invalid_payload_schema",
                "event_id": event.id,
                "error": e.errors(),
            }
        )
        return

    track_id = payload.playlist_track_id
    new_position = payload.new_position
    expected_current_position = payload.current_position

    if new_position <= 0:
        logger.error(
            {
                "event": "worker_move_aborted",
                "reason": "invalid_new_position",
                "event_id": event.id,
                "requested_position": new_position,
            }
        )
        return

    try:
        # Lock playlist
        await db.execute(
            select(Playlist.id).where(Playlist.id == playlist_id).with_for_update()
        )
        target_track = await db.get(PlaylistTrack, track_id)

        # Check validity
        if not target_track or target_track.playlist_id != playlist_id:
            logger.warning(
                {
                    "event": "worker_move_aborted",
                    "reason": "track_not_found_or_invalid",
                    "event_id": event.id,
                    "track_id": track_id,
                }
            )
            return
        if target_track.position != expected_current_position:
            logger.warning(
                {
                    "event": "worker_move_aborted",
                    "reason": "stale_state_detected",
                    "event_id": event.id,
                    "track_id": track_id,
                    "actual_position": target_track.position,
                    "expected_position": expected_current_position,
                }
            )
            return
        old_position = target_track.position
        if old_position == new_position:
            return

        # Deal with out of bounds position
        count_query = select(func.count(PlaylistTrack.id)).where(
            PlaylistTrack.playlist_id == playlist_id
        )
        total_tracks_result = await db.execute(count_query)
        total_tracks = total_tracks_result.scalar() or 0
        if new_position > total_tracks:
            logger.info(
                {
                    "event": "worker_move_clamped_to_last",
                    "event_id": event.id,
                    "requested_position": new_position,
                    "adjusted_position": total_tracks,
                }
            )
            new_position = total_tracks
            if old_position == new_position:
                return

        # Update queue
        target_track.position = -1
        await db.flush()
        if new_position < old_position:
            stmt = (
                update(PlaylistTrack)
                .where(
                    PlaylistTrack.playlist_id == playlist_id,
                    PlaylistTrack.position >= new_position,
                    PlaylistTrack.position < old_position,
                )
                .values(position=PlaylistTrack.position + 1)
            )
        else:
            stmt = (
                update(PlaylistTrack)
                .where(
                    PlaylistTrack.playlist_id == playlist_id,
                    PlaylistTrack.position > old_position,
                    PlaylistTrack.position <= new_position,
                )
                .values(position=PlaylistTrack.position - 1)
            )

        await db.execute(stmt)
        target_track.position = new_position
        await db.commit()
        logger.info(
            {
                "event": "worker_track_moved",
                "event_id": event.id,
                "track_id": track_id,
                "old_position": old_position,
                "new_position": new_position,
                "status": "success",
            }
        )

    except Exception as e:
        await db.rollback()
        logger.error(
            {
                "event": "worker_move_failed",
                "reason": "database_error",
                "event_id": event.id,
                "error": str(e),
            }
        )
