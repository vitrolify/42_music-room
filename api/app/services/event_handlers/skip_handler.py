import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue
from app.models.playlist_track import TrackPlaybackStatus
from app.schemas.event import PlaybackPayload
from app.services.playlist_service import lock_playlist
from app.services.playlist_track_service import (
    get_playing_track_by_id,
    get_track_by_position,
    set_track_zero_to,
    shift_queue_up,
)
from app.websockets.playlist_manager import playlist_ws_manager

logger = logging.getLogger(__name__)


async def process_skip_track(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:
    try:
        payload = PlaybackPayload.model_validate(event.payload)
    except Exception as e:
        logger.error({"event": "invalid_skip_payload", "error": str(e)})
        return

    try:
        await lock_playlist(db, playlist_id)
        current_track = await get_playing_track_by_id(
            db, playlist_id, payload.playlist_track_id
        )
        if not current_track:
            logger.warning(
                {
                    "event": "skip_ignored",
                    "reason": "track_not_at_position_zero",
                    "playlist_track_id": payload.playlist_track_id,
                    "msg": "Track is no longer at position 0. Ignoring skip.",
                }
            )
            await db.rollback()
            return

        await db.delete(current_track)
        await db.flush()
        await shift_queue_up(db, playlist_id)
        await set_track_zero_to(TrackPlaybackStatus.playing, db, playlist_id)
        new_track = await get_track_by_position(db, playlist_id, 0)
        ws_message = _build_track_skipped_payload(
            playlist_id=playlist_id,
            new_playing_track_id=new_track.id if new_track else None,
            track_info_id=new_track.track_info_id if new_track else None,
        )

        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(
            {
                "event": "worker_skip_handler_error",
                "reason": "database_error",
                "event_id": event.id,
                "error": str(e),
            }
        )
        return

    try:
        await playlist_ws_manager.broadcast_playlist_update(
            playlist_id=playlist_id, message=ws_message, user_id=event.user_id
        )
    except Exception as e:
        logger.error(
            {"event": "worker_broadcast_failed", "event_id": event.id, "error": str(e)}
        )


def _build_track_skipped_payload(
    playlist_id: int, new_playing_track_id: int | None, track_info_id: str | None
) -> dict:
    return {
        "type": "TRACK_SKIPPED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "playlist_id": playlist_id,
            "new_playing_track_id": new_playing_track_id,
            "track_info_id": track_info_id,
        },
    }
