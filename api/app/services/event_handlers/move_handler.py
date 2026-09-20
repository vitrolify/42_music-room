import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue
from app.models.playlist_track import PlaylistTrack
from app.schemas.event import MovePayload
from app.services.playlist_service import lock_playlist
from app.services.playlist_track_service import shift_tracks
from app.websockets.playlist_manager import playlist_ws_manager

logger = logging.getLogger(__name__)


async def process_move_track(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:
    payload = _parse_move_payload(event)
    if not payload:
        return

    if not _is_valid_new_position(event.id, payload):
        return

    new_position = await _execute_move_transaction(db, event, playlist_id, payload)
    if new_position is None:
        return

    await _broadcast_move_success(playlist_id, event, payload, new_position)


def _parse_move_payload(event: EventQueue) -> MovePayload | None:
    try:
        return MovePayload.model_validate(event.payload)
    except Exception as e:
        logger.error("Invalid move payload: %s", e)
        return None


def _is_valid_new_position(event_id: int, payload: MovePayload) -> bool:
    if payload.new_position <= 0:
        logger.error(
            "Worker move aborted: invalid new position %s (event_id=%s)",
            payload.new_position,
            event_id,
        )
        return False
    return True


async def _execute_move_transaction(
    db: AsyncSession, event: EventQueue, playlist_id: int, payload: MovePayload
) -> int | None:
    try:
        await lock_playlist(db, playlist_id)

        target_track = await _validate_track(db, playlist_id, payload)
        new_position = await _get_clamped_position(db, event, playlist_id, payload)

        target_track.position = -1
        await db.flush()

        await shift_tracks(db, playlist_id, payload.current_position, new_position)

        target_track.position = new_position
        await db.commit()

        return new_position

    except ValueError as e:
        await db.rollback()
        logger.warning(
            "Worker move aborted: %s (event_id=%s, track_id=%s)",
            e,
            event.id,
            payload.playlist_track_id,
        )
        await playlist_ws_manager.broadcast_error(
            playlist_id=playlist_id,
            target_user_id=event.user_id,
            code="STALE_STATE",
            message="The playlist has changed. Your action was not processed",
        )
        return None
    except Exception as e:
        await db.rollback()
        logger.error(
            "Worker move track failed (database error, event_id=%s): %s",
            event.id,
            e,
        )
        return None


async def _validate_track(
    db: AsyncSession, playlist_id: int, payload: MovePayload
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
    db: AsyncSession, event: EventQueue, playlist_id: int, payload: MovePayload
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
            "Worker move clamped to last position %s -> %s (event_id=%s)",
            payload.new_position,
            total_tracks,
            event.id,
        )
        if payload.current_position == total_tracks:
            raise ValueError("track_already_in_last_position")
        return total_tracks
    return payload.new_position


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


async def _broadcast_move_success(
    playlist_id: int, event: EventQueue, payload: MovePayload, new_position: int
) -> None:
    try:
        ws_message = _build_track_moved_payload(
            track_id=payload.playlist_track_id,
            old_pos=payload.current_position,
            new_pos=new_position,
        )

        await playlist_ws_manager.broadcast_playlist_update(
            playlist_id=playlist_id, message=ws_message, user_id=event.user_id
        )

        logger.info(
            "Worker track moved (event_id=%s, track_id=%s, %s -> %s)",
            event.id,
            payload.playlist_track_id,
            payload.current_position,
            new_position,
        )
    except Exception as e:
        logger.error(
            "Worker broadcast move track failed (event_id=%s): %s",
            event.id,
            e,
        )
