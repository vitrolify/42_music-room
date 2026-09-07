import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal

from app.models.event_queue import EventQueue
from app.models.playlist_track import TrackPlaybackStatus
from app.models.user_playback_state import PlaybackStatus
from app.schemas.event import PlaybackPayload
from app.services.playback_service import apply_playlist_command, synchronize_playlist_track
from app.services.playlist_service import get_playlist_by_id, lock_playlist
from app.services.playlist_track_service import (
    get_playing_track_by_id,
    get_track_by_position,
    set_track_zero_to,
    shift_queue_up,
)
from app.websockets.playlist_manager import playlist_ws_manager
from app.websockets.playback_manager import playback_ws_manager

logger = logging.getLogger(__name__)


async def process_skip_track(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:

    payload = _parse_skip_payload(event)
    if not payload:
        return

    ws_message = await _execute_skip_transaction(db, event, playlist_id, payload)
    if not ws_message:
        return

    await _broadcast_skip_success(playlist_id, event, ws_message)


def _parse_skip_payload(event: EventQueue) -> PlaybackPayload | None:
    try:
        return PlaybackPayload.model_validate(event.payload)
    except Exception as e:
        logger.error({"event": "invalid_skip_payload", "error": str(e)})
        return None


async def _execute_skip_transaction(
    db: AsyncSession, event: EventQueue, playlist_id: int, payload: PlaybackPayload
) -> dict | None:
    # New clients carry the durable controller contract.  Keep the legacy path
    # below only for old queued events created before this migration.
    if payload.device_id and payload.session_id:
        try:
            state, new_track = await apply_playlist_command(
                db, playlist_id=playlist_id, actor_id=event.user_id,
                command="ended" if event.event.value == "ended" else "skip",
                playlist_track_id=payload.playlist_track_id,
                device_id=payload.device_id, session_id=payload.session_id,
                expected_version=payload.expected_version,
                position_seconds=payload.position_seconds,
                duration_seconds=payload.duration_seconds,
            )
            return _build_track_skipped_payload(
                playlist_id, new_track.id if new_track else None
            ) | {"playback_version": state.version}
        except (PermissionError, ValueError) as exc:
            await db.rollback()
            logger.warning({"event": "skip_or_end_rejected", "reason": str(exc)})
            return None
    try:
        await lock_playlist(db, playlist_id)

        current_track = await get_playing_track_by_id(
            db, playlist_id, payload.playlist_track_id
        )
        if not current_track:
            await db.rollback()
            logger.warning(
                {
                    "event": "skip_ignored",
                    "reason": "track_not_at_position_zero",
                    "playlist_track_id": payload.playlist_track_id,
                    "msg": "Track is no longer at position 0. Ignoring skip.",
                }
            )
            await playlist_ws_manager.broadcast_error(
                playlist_id=playlist_id,
                target_user_id=event.user_id,
                code="STALE_STATE",
                message="The playlist has changed. Your action was not processed",
            )
            return None

        await db.delete(current_track)
        await db.flush()
        await shift_queue_up(db, playlist_id)
        await set_track_zero_to(TrackPlaybackStatus.playing, db, playlist_id)

        new_track = await get_track_by_position(db, playlist_id, 0)
        playlist = await get_playlist_by_id(db, playlist_id)
        if not playlist:
            raise ValueError("Playlist not found")
        await synchronize_playlist_track(
            db, owner_id=playlist.owner_id, playlist_id=playlist_id, track=new_track,
            status=PlaybackStatus.PLAYING if new_track else PlaybackStatus.PAUSED,
        )
        ws_message = _build_track_skipped_payload(
            playlist_id=playlist_id,
            new_playing_track_id=new_track.id if new_track else None,
        )
        await db.commit()

        return ws_message
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
        return None


def _build_track_skipped_payload(
    playlist_id: int, new_playing_track_id: int | None
) -> dict:
    return {
        "type": "TRACK_SKIPPED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "playlist_id": playlist_id,
            "new_playing_track_id": new_playing_track_id,
        },
    }


async def _broadcast_skip_success(
    playlist_id: int, event: EventQueue, ws_message: dict
) -> None:
    try:
        logger.info(
            {
                "event": "worker_track_skipped",
                "event_id": event.id,
                "playlist_id": playlist_id,
                "status": "success",
            }
        )
        await playlist_ws_manager.broadcast_playlist_update(
            playlist_id=playlist_id, message=ws_message, user_id=event.user_id
        )
        from app.api.v1.endpoints.playback import read_state
        from app.schemas.playback import PlaybackEvent
        from app.services.playback_service import get_state

        async with db_session_for_broadcast() as db:
            playlist = await get_playlist_by_id(db, playlist_id)
            state = await get_state(db, playlist.owner_id) if playlist else None
            if playlist and state:
                event_payload = PlaybackEvent(
                    version=state.version, payload=read_state(state)
                )
                await playback_ws_manager.publish(
                    playlist.owner_id, event_payload.model_dump(mode="json")
                )
    except Exception as e:
        logger.error(
            {"event": "worker_broadcast_failed", "event_id": event.id, "error": str(e)}
        )


@asynccontextmanager
async def db_session_for_broadcast():
    async with AsyncSessionLocal() as db:
        yield db
