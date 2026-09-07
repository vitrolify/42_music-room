import uuid

from fastapi import APIRouter, BackgroundTasks, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.redis import get_active_device
from app.db.session import AsyncSessionLocal, get_db
from app.models.event_queue import EventQueue, PlaylistEventType
from app.models.playlist import Playlist
from app.schemas.event import EVENT_EXAMPLES, EventCreate, EventRead
from app.schemas.playback import PlaybackEvent, PlaylistPlaybackCommand
from app.services import device_service, event_service, playlist_service, worker_service
from app.services.playback_service import apply_playlist_command, get_state
from app.websockets.playback_manager import playback_ws_manager
from app.websockets.playlist_manager import playlist_ws_manager

router = APIRouter(tags=["events"], prefix="/playlists/{playlist_id}")


@router.put("/playback", response_model=PlaybackEvent)
async def command_playlist_playback(
    playlist_id: int,
    payload: PlaylistPlaybackCommand,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Playlist-scoped controls, including controller progress/end reports."""
    playlist = await playlist_service.get_playlist_by_id(db, playlist_id)
    if not playlist:
        raise BaseVitrolifyException(
            "PLAYLIST_NOT_FOUND", "Playlist não encontrada", 404
        )
    if not await playlist_service.user_has_playlist_permission(
        db, user_id, playlist, action="edit"
    ):
        raise BaseVitrolifyException("FORBIDDEN", "Forbidden", 403)
    try:
        state, track = await apply_playlist_command(
            db, playlist_id=playlist_id, actor_id=user_id, command=payload.command,
            playlist_track_id=payload.playlist_track_id, device_id=payload.device_id,
            session_id=payload.session_id, expected_version=payload.expected_version,
            position_seconds=payload.position_seconds,
            duration_seconds=payload.duration_seconds,
        )
    except PermissionError as exc:
        raise BaseVitrolifyException("FORBIDDEN", str(exc), 403) from exc
    except ValueError as exc:
        raise BaseVitrolifyException("INVALID_PLAYBACK_COMMAND", str(exc), 409) from exc

    from app.api.v1.endpoints.playback import read_state
    event = PlaybackEvent(version=state.version, payload=read_state(state))
    await playlist_ws_manager.broadcast_playlist_update(
        playlist_id=playlist_id,
        user_id=user_id,
        message={"type": "PLAYLIST_PLAYBACK_CHANGED", "payload": {
            "playlist_id": playlist_id,
            "playing_track_id": track.id if track else None,
            "status": state.status.value,
            "version": state.version,
        }},
    )
    await playback_ws_manager.publish(playlist.owner_id, event.model_dump(mode="json"))
    return event


@router.post(
    "/events",
    response_model=EventRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_playlist_event(
    playlist_id: int,
    background_tasks: BackgroundTasks,
    payload: EventCreate = Body(..., openapi_examples=EVENT_EXAMPLES),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    playlist = await playlist_service.get_playlist_by_id(db=db, playlist_id=playlist_id)
    if playlist is None:
        raise BaseVitrolifyException(
            error_code="PLAYLIST_NOT_FOUND",
            message="Playlist não encontrada",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    await _verify_event_permissions(db, playlist, user_id, payload.event)

    event_data_for_jsonb = payload.model_dump(exclude={"event"})
    event_record = await event_service.create_event_in_db(
        db=db,
        playlist_id=playlist_id,
        user_id=user_id,
        event_type=payload.event,
        payload=event_data_for_jsonb,
    )

    background_tasks.add_task(_run_worker_task, event_record)

    return event_record


async def _run_worker_task(event: EventQueue):
    async with AsyncSessionLocal() as db_session:
        await worker_service.dispatch_event(db_session, event)


async def _verify_event_permissions(
    db: AsyncSession,
    playlist: Playlist,
    user_id: uuid.UUID,
    event_type: PlaylistEventType,
) -> None:
    # General Playlist Edit Permission
    is_authorized = await playlist_service.user_has_playlist_permission(
        db=db, user_id=user_id, playlist=playlist, action="edit"
    )
    if not is_authorized:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Você não tem permissão para realizar esta ação na playlist.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # Specific Playback Control Delegation Check
    if event_type in (
        PlaylistEventType.skip,
        PlaylistEventType.pause,
        PlaylistEventType.play,
    ):
        if playlist.owner_id != user_id:
            playback = await get_state(db, playlist.owner_id)
            if (
                not playback
                or playback.active_playlist_id != playlist.id
                or not playback.controller_device_id
            ):
                raise BaseVitrolifyException(
                    error_code="NO_ACTIVE_DEVICE",
                    message="O dono da playlist não está ouvindo música no momento.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
            is_delegate = await device_service.has_device_delegation(
                db=db, device_id=playback.controller_device_id, delegate_id=user_id
            )
            if not is_delegate:
                raise BaseVitrolifyException(
                    error_code="FORBIDDEN",
                    message="Você não tem permissão de controle para o dispositivo.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
