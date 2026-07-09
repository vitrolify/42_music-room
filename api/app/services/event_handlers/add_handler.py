import logging
from datetime import datetime, timezone

from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue
from app.models.playlist_track import PlaylistTrack, TrackPlaybackStatus
from app.schemas.event import AddPayload
from app.services.playlist_service import lock_playlist
from app.services.playlist_track_service import get_track_by_position, insert_track
from app.services.track_info_service import get_or_update_track_info
from app.websockets.playlist_manager import playlist_ws_manager

logger = logging.getLogger(__name__)


async def process_add_track_event(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:
    """
    Processes the 'add' event by calculating the next available position in the queue.
    """
    try:
        payload = AddPayload.model_validate(event.payload)
    except Exception as e:
        logger.error({"event": "invalid_skip_payload", "error": str(e)})
        return

    try:
        track_info = await get_or_update_track_info(db, payload.track_info_id)

        await lock_playlist(db, playlist_id)

        track_at_zero = await get_track_by_position(db, playlist_id, 0)
        if not track_at_zero:
            target_position = 0
            target_status = TrackPlaybackStatus.paused
        else:
            target_position = await _get_next_position(db, playlist_id)
            target_status = TrackPlaybackStatus.queued

        new_track = await insert_track(
            db,
            event.user_id,
            playlist_id,
            target_position,
            track_info.id,
            target_status,
        )
        await db.flush()

        await db.refresh(new_track, ["user", "track_info"])
        ws_message = _build_track_added_payload(new_track)

        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(
            {
                "event": "worker_add_failed",
                "reason": "database_error",
                "event_id": event.id,
                "error": str(e),
            }
        )
        return

    try:
        logger.info(
            {
                "event": "worker_track_added",
                "event_id": event.id,
                "playlist_id": playlist_id,
                "track_info_id": payload.track_info_id,
                "position": ws_message["payload"]["position"],
                "status": "success",
            }
        )
        await playlist_ws_manager.broadcast_playlist_update(
            playlist_id, ws_message, event.user_id
        )
    except Exception as e:
        logger.error(
            {
                "event": "worker_broadcast_failed",
                "event_id": event.id,
                "error": str(e),
            }
        )


async def _get_next_position(db: AsyncSession, playlist_id: int) -> int:
    """Return the next available position (current max + 1) in the playlist."""
    query = select(func.max(PlaylistTrack.position)).where(
        PlaylistTrack.playlist_id == playlist_id
    )
    result = await db.execute(query)
    current_max = result.scalar() or 0
    return current_max + 1


def _build_track_added_payload(track: PlaylistTrack) -> dict:
    return jsonable_encoder(
        {
            "type": "TRACK_ADDED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "playlist_track_id": track.id,
                "position": track.position,
                "status": track.status,
                "track_info": {
                    "id": track.track_info.id,
                    "title": track.track_info.title,
                    "channel_title": track.track_info.channel_title,
                    "thumbnail": track.track_info.thumbnail_url,
                    "duration": track.track_info.duration_seconds,
                },
                "added_by": {
                    "user_id": track.user.id if track.user else None,
                    "name": track.user.display_name if track.user else "Anônimo",
                },
            },
        }
    )
