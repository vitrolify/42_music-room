import logging
from datetime import datetime, timezone

from pydantic import ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue
from app.models.playlist import Playlist
from app.models.playlist_track import PlaylistTrack
from app.schemas.event import MoveEventPayload
from app.websockets.playlist_manager import playlist_ws_manager

logger = logging.getLogger(__name__)


async def process_move_track(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:

    payload = _validate_payload(event)
    if not payload:
        return

    new_position = 0
    try:
        await _lock_playlist(db, playlist_id)

        target_track = await _validate_track(db, playlist_id, payload)
        new_position = await _get_clamped_position(db, event, playlist_id, payload)

        target_track.position = -1
        await db.flush()
        await _shift_tracks(db, playlist_id, payload.current_position, new_position)
        target_track.position = new_position
        await db.commit()

    except ValueError as e:
        await db.rollback()
        logger.warning(
            {
                "event": "worker_move_aborted",
                "reason": str(e),
                "event_id": event.id,
                "track_id": payload.playlist_track_id,
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

    try:
        ws_message = _build_track_moved_payload(
            track_id=payload.playlist_track_id,
            old_pos=payload.current_position,
            new_pos=new_position,
        )

        await playlist_ws_manager.broadcast_playlist_update(
            playlist_id=playlist_id, message=ws_message
        )

        logger.info(
            {
                "event": "worker_track_moved",
                "event_id": event.id,
                "track_id": payload.playlist_track_id,
                "old_position": payload.current_position,
                "new_position": new_position,
                "status": "success",
            }
        )
    except Exception as e:
        logger.error(
            {"event": "worker_broadcast_failed", "event_id": event.id, "error": str(e)}
        )


def _validate_payload(event: EventQueue) -> MoveEventPayload | None:
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
        return None

    if payload.new_position <= 0:
        logger.error(
            {
                "event": "worker_move_aborted",
                "reason": "invalid_new_position",
                "event_id": event.id,
                "requested_position": payload.new_position,
            }
        )
        return None
    return payload


async def _lock_playlist(db: AsyncSession, playlist_id: int) -> None:
    """Acquire a row-level lock on the playlist to serialize concurrent moves."""
    await db.execute(
        select(Playlist.id).where(Playlist.id == playlist_id).with_for_update()
    )


async def _validate_track(
    db: AsyncSession, playlist_id: int, payload: MoveEventPayload
) -> PlaylistTrack:
    """
    Fetch and validate the target track. Returns the track on success, None on failure.
    Checks:
      - Track exists and belongs to the playlist.
      - Track position matches the expected position (stale-state guard).
    """

    target_track = await db.get(PlaylistTrack, payload.playlist_track_id)

    if not target_track or target_track.playlist_id != playlist_id:
        raise ValueError("track_not_found_or_invalid")

    if target_track.position != payload.current_position:
        raise ValueError("stale_state_detected")

    if target_track.position == payload.new_position:
        raise ValueError("track_already_in_position")

    return target_track


async def _get_clamped_position(
    db: AsyncSession, event: EventQueue, playlist_id: int, payload: MoveEventPayload
) -> int:
    """
    Clamp new_position to the total number of tracks in the playlist.
    Logs a warning if clamping occurs.
    """
    count_query = select(func.count(PlaylistTrack.id)).where(
        PlaylistTrack.playlist_id == playlist_id
    )
    total_tracks = (await db.execute(count_query)).scalar() or 0

    if payload.new_position > total_tracks:
        logger.info(
            {
                "event": "worker_move_clamped_to_last",
                "event_id": event.id,
                "requested_position": payload.new_position,
                "adjusted_position": total_tracks,
            }
        )
        if payload.current_position == total_tracks:
            raise ValueError("track_already_in_last_position")
        return total_tracks
    return payload.new_position


async def _shift_tracks(
    db: AsyncSession,
    playlist_id: int,
    old_position: int,
    new_position: int,
) -> None:
    """
    Shift the positions of tracks between old_position and new_position
    to make room for the moved track.
      - Moving up (new < old): tracks in [new, old) shift down by +1.
      - Moving down (new > old): tracks in (old, new] shift up by -1.
    Caller must set the moving track's position to -1 and flush before calling
    this, so it is excluded from the range updates.
    """
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


def _build_track_moved_payload(track_id: int, old_pos: int, new_pos: int) -> dict:
    return {
        "type": "TRACK_MOVED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "playlist_track_id": track_id,
            "old_position": old_pos,
            "new_position": new_pos,
        },
    }
