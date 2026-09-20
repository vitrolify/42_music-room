import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue
from app.schemas.event import PlaybackPayload
from app.services.playlist_service import lock_playlist
from app.services.playlist_track_service import get_track_by_id, shift_queue_up
from app.websockets.playlist_manager import playlist_ws_manager

logger = logging.getLogger(__name__)


async def process_delete_track(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:
    """Orquestra o evento de remoção de uma música da fila."""

    payload = _parse_delete_payload(event)
    if not payload:
        return

    ws_message = await _execute_delete_transaction(db, event, playlist_id, payload)
    if not ws_message:
        return

    await _broadcast_delete_success(playlist_id, event, payload, ws_message)


def _parse_delete_payload(event: EventQueue) -> PlaybackPayload | None:
    try:
        return PlaybackPayload.model_validate(event.payload)
    except Exception as e:
        logger.error("Invalid delete payload: %s", e)
        return None


async def _execute_delete_transaction(
    db: AsyncSession, event: EventQueue, playlist_id: int, payload: PlaybackPayload
) -> dict | None:
    try:
        await lock_playlist(db, playlist_id)

        track_to_delete = await get_track_by_id(
            db, playlist_id, payload.playlist_track_id
        )

        if not track_to_delete:
            await db.rollback()
            logger.warning(
                "Delete aborted: track %s not found in playlist %s",
                payload.playlist_track_id,
                playlist_id,
            )
            await playlist_ws_manager.broadcast_error(
                playlist_id=playlist_id,
                target_user_id=event.user_id,
                code="STALE_STATE",
                message="The playlist has changed. Your action was not processed",
            )
            return None

        deleted_position = track_to_delete.position
        if deleted_position == 0:
            logger.warning(
                "Delete aborted: cannot delete track at position zero (track_id=%s)",
                payload.playlist_track_id,
            )
            await db.rollback()
            return None

        await db.delete(track_to_delete)
        await db.flush()

        await shift_queue_up(db, playlist_id, from_position=deleted_position)

        ws_message = _build_track_deleted_payload(
            payload.playlist_track_id, deleted_position
        )

        await db.commit()
        return ws_message

    except Exception as e:
        await db.rollback()
        logger.error(
            "Worker delete track failed (database error, event_id=%s): %s",
            event.id,
            e,
        )
        return None


def _build_track_deleted_payload(track_id: int, pos: int) -> dict:
    return {
        "type": "TRACK_DELETED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {"playlist_track_id": track_id, "deleted_position": pos},
    }


async def _broadcast_delete_success(
    playlist_id: int, event: EventQueue, payload: PlaybackPayload, ws_message: dict
) -> None:
    try:
        logger.info(
            "Worker track deleted (event_id=%s, track_id=%s)",
            event.id,
            payload.playlist_track_id,
        )
        await playlist_ws_manager.broadcast_playlist_update(
            playlist_id=playlist_id, message=ws_message, user_id=event.user_id
        )
    except Exception as e:
        logger.error(
            "Worker broadcast delete track failed (event_id=%s): %s",
            event.id,
            e,
        )
