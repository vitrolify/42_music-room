import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import TypeGuard

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.event_queue import EventQueue, PlaylistEventType
from app.models.playlist_track import PlaylistTrack, TrackPlaybackStatus
from app.models.user_playback_state import PlaybackStatus
from app.schemas.event import PlaybackPayload
from app.services.playback_service import (
    apply_playlist_command,
    synchronize_playlist_track,
)
from app.services.playlist_service import get_playlist_by_id, lock_playlist
from app.services.playlist_track_service import get_playing_track_by_id
from app.websockets.playback_manager import playback_ws_manager
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
    if payload.device_id and payload.session_id:
        try:
            state, current = await apply_playlist_command(
                db, playlist_id=playlist_id, actor_id=event.user_id,
                command=event.event.value, playlist_track_id=payload.playlist_track_id,
                device_id=payload.device_id, session_id=payload.session_id,
                expected_version=payload.expected_version,
                position_seconds=payload.position_seconds,
                duration_seconds=payload.duration_seconds,
            )
            return _build_playback_changed_payload(
                playlist_id, current.id if current else payload.playlist_track_id,
                target_status,
            ) | {"playback_version": state.version}
        except (PermissionError, ValueError) as exc:
            await db.rollback()
            logger.warning({"event": "playback_rejected", "reason": str(exc)})
            return None
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
        playlist = await get_playlist_by_id(db, playlist_id)
        if not playlist:
            raise ValueError("Playlist not found")
        await synchronize_playlist_track(
            db,
            owner_id=playlist.owner_id,
            playlist_id=playlist_id,
            track=current_track,
            status=(
                PlaybackStatus.PLAYING
                if target_status == TrackPlaybackStatus.playing
                else PlaybackStatus.PAUSED
            ),
        )

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
        # The worker owns a fresh session, so read the committed owner snapshot
        # before publishing it to every owner device.
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
