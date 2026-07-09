import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.session import AsyncSessionLocal, get_db
from app.models.event_queue import EventQueue, PlaylistEventType
from app.schemas.event import EventCreate, EventRead
from app.services import (
    event_service,
    playlist_service,
    worker_service,
)

router = APIRouter(tags=["events"], prefix="/playlists/{playlist_id}")


@router.post(
    "/events",
    response_model=EventRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_playlist_event(
    playlist_id: int,
    payload: EventCreate,
    background_tasks: BackgroundTasks,
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

    # Check permissions
    if payload.event == PlaylistEventType.skip:
        if playlist.owner_id != user_id:
            raise BaseVitrolifyException(
                error_code="FORBIDDEN",
                message="Apenas o criador da playlist pode pular a música.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
    is_authorized = await playlist_service.user_has_playlist_permission(
        db=db, user_id=user_id, playlist=playlist, action="edit"
    )
    if not is_authorized:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Você não tem permissão para realizar esta ação na playlist.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    event_data_for_jsonb = payload.model_dump(exclude={"event"})
    event_record = await event_service.create_event_in_db(
        db=db,
        playlist_id=playlist_id,
        user_id=user_id,
        event_type=payload.event,
        payload=event_data_for_jsonb,
    )

    background_tasks.add_task(run_worker_task, event_record)

    return event_record


async def run_worker_task(event: EventQueue):
    async with AsyncSessionLocal() as db_session:
        await worker_service.dispatch_event(db_session, event)
