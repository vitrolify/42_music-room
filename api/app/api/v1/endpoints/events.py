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
from app.services import device_service, event_service, playlist_service, worker_service

router = APIRouter(tags=["events"], prefix="/playlists/{playlist_id}")


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
        PlaylistEventType.delete,
    ):
        if playlist.owner_id != user_id:
            active_device_str = await get_active_device(playlist.id)
            if not active_device_str:
                raise BaseVitrolifyException(
                    error_code="NO_ACTIVE_DEVICE",
                    message="O dono da playlist não está ouvindo música no momento.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
            try:
                active_device_uuid = uuid.UUID(active_device_str)
            except ValueError:
                raise BaseVitrolifyException(
                    error_code="INVALID_DEVICE_STATE",
                    message="Estado do dispositivo inválido no servidor.",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            is_delegate = await device_service.has_device_delegation(
                db=db, device_id=active_device_uuid, delegate_id=user_id
            )
            if not is_delegate:
                raise BaseVitrolifyException(
                    error_code="FORBIDDEN",
                    message="Você não tem permissão de controle para o dispositivo ativo.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
