import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.session import get_db
from app.schemas.playlist_track import (
    PlaylistTrackRead,
)
from app.services import invite_service, playlist_service, playlist_track_service

router = APIRouter(tags=["playlist_tracks"])


@router.get(
    "/playlists/{playlist_id}/tracks",
    response_model=list[PlaylistTrackRead],
    status_code=status.HTTP_200_OK,
)
async def list_playlist_tracks(
    playlist_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    playlist = await playlist_service.get_playlist_by_id(db=db, playlist_id=playlist_id)
    if playlist is None:
        raise BaseVitrolifyException(
            error_code="PLAYLIST_NOT_FOUND",
            message="Playlist nao encontrada",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    is_owner = playlist.owner_id == user_id
    if not playlist.public and not is_owner:
        has_invite = await invite_service.check_user_has_accepted_invite(
            db=db, user_id=user_id, playlist_id=playlist_id
        )
        if not has_invite:
            raise BaseVitrolifyException(
                error_code="FORBIDDEN",
                message="Você não tem permissão para visualizar esta playlist",
                status_code=status.HTTP_403_FORBIDDEN,
            )

    return await playlist_track_service.get_tracks_by_playlist(
        db=db, playlist_id=playlist_id
    )
