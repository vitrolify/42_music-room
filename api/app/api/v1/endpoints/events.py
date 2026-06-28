import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.session import get_db
from app.schemas.event import EventCreate, EventRead
from app.services import event_service, invite_service, playlist_service

router = APIRouter(tags=["events"], prefix="/playlists/{playlist_id}")


@router.post(
    "/events",
    response_model=EventRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_playlist_event(
    playlist_id: int,
    payload: EventCreate,
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
    is_owner = playlist.owner_id == user_id

    if not playlist.public and not is_owner:
        has_invite = await invite_service.check_user_has_accepted_invite(
            db=db, user_id=user_id, playlist_id=playlist_id
        )
        if not has_invite:
            raise BaseVitrolifyException(
                error_code="FORBIDDEN",
                message="Você não tem permissão para acessar esta playlist privada",
                status_code=status.HTTP_403_FORBIDDEN,
            )

    if not is_owner and playlist.invited_only_edit:
        has_invite = await invite_service.check_user_has_accepted_invite(
            db=db, user_id=user_id, playlist_id=playlist_id
        )
        if not has_invite:
            raise BaseVitrolifyException(
                error_code="FORBIDDEN",
                message="Esta playlist exige convite aceito para receber modificações",
                status_code=status.HTTP_403_FORBIDDEN,
            )

    # Record Event
    event_record = await event_service.create_event_in_db(
        db=db,
        playlist_id=playlist_id,
        user_id=user_id,
        event_type=payload.event,
        track_info_id=payload.track_info_id,
        payload=payload.payload,
    )

    # implement background worker here

    return event_record
