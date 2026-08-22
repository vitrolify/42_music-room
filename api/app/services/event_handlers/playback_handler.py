import logging
from datetime import datetime, timezone
from typing import TypeGuard

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue, PlaylistEventType
from app.models.playlist_track import PlaylistTrack, TrackPlaybackStatus
from app.schemas.event import PlaybackPayload
from app.services.playlist_service import lock_playlist
from app.services.playlist_track_service import get_playing_track_by_id
from app.websockets.playlist_manager import playlist_ws_manager

logger = logging.getLogger(__name__)


async def process_playback_event(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:
    payload = _parse_playback_payload(event)
    if not payload:
        return

    target_status = (
        TrackPlaybackStatus.playing
        if event.event == PlaylistEventType.play
        else TrackPlaybackStatus.paused
    )

    ws_message = await _execute_playback_transaction(
        db, event, playlist_id, payload, target_status
    )
    if not ws_message:
        return

    await _broadcast_playback_success(playlist_id, event, ws_message)


def _parse_playback_payload(event: EventQueue) -> PlaybackPayload | None:
    try:
        return PlaybackPayload.model_validate(event.payload)
    except Exception as e:
        logger.error({"event": "invalid_playback_payload", "error": str(e)})
        return None


async def _execute_playback_transaction(
    db: AsyncSession,
    event: EventQueue,
    playlist_id: int,
    payload: PlaybackPayload,
    target_status: TrackPlaybackStatus,
) -> dict | None:
    try:
        await lock_playlist(db, playlist_id)

        current_track = await get_playing_track_by_id(
            db, playlist_id, payload.playlist_track_id
        )

        if not _state_is_valid(current_track, target_status, payload, event):
            await db.rollback()
            await playlist_ws_manager.broadcast_error(
                playlist_id=playlist_id,
                target_user_id=event.user_id,
                code="STALE_STATE",
                message="The playlist has changed. Your action was not processed",
            )
            return None
        current_track.status = target_status

        ws_message = _build_playback_changed_payload(
            playlist_id=playlist_id,
            playlist_track_id=current_track.id,
            new_status=target_status,
        )
        await db.commit()

        return ws_message
    except Exception as e:
        await db.rollback()
        logger.error(
            {
                "event": f"worker_{event.event.value}_failed",
                "reason": "database_error",
                "event_id": event.id,
                "error": str(e),
            }
        )
        return None


def _state_is_valid(
    current_track: PlaylistTrack | None,
    target_status: TrackPlaybackStatus,
    payload: PlaybackPayload,
    event: EventQueue,
) -> TypeGuard[PlaylistTrack]:
    if not current_track:
        logger.warning(
            {
                "event": f"{event.event.value}_ignored",
                "reason": "track_not_at_position_zero",
                "playlist_track_id": payload.playlist_track_id,
            }
        )
        return False
    if current_track.status == target_status:
        logger.info(
            {
                "event": f"worker_{event.event.value}_aborted",
                "reason": "already_in_target_status",
                "playlist_track_id": payload.playlist_track_id,
            }
        )
        return False
    return True


def _build_playback_changed_payload(
    playlist_id: int, playlist_track_id: int, new_status: TrackPlaybackStatus
) -> dict:
    if new_status == TrackPlaybackStatus.paused:
        event_type = "TRACK_PAUSED"
    else:
        event_type = "TRACK_PLAYING"

    return {
        "type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "playlist_id": playlist_id,
            "playing_track_id": playlist_track_id,
            "new_status": new_status.value,
        },
    }


async def _broadcast_playback_success(
    playlist_id: int, event: EventQueue, ws_message: dict
) -> None:
    try:
        logger.info(
            {
                "event": f"worker_{event.event.value}_success",
                "event_id": event.id,
                "playlist_id": playlist_id,
                "status": "success",
            }
        )
        await playlist_ws_manager.broadcast_playlist_update(
            playlist_id=playlist_id, message=ws_message, user_id=event.user_id
        )
    except Exception as e:
        logger.error(
            {"event": "worker_broadcast_failed", "event_id": event.id, "error": str(e)}
        )
