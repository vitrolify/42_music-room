"""Endpoints de Playlist e Invite."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.redis import get_active_device
from app.db.session import get_db
from app.models.device import Device
from app.schemas.playlist import PlaylistCreate, PlaylistRead, PlaylistUpdate
from app.services import playlist_service

router = APIRouter(tags=["playlists"])


@router.post(
    "/playlists",
    response_model=PlaylistRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_playlist(
    payload: PlaylistCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await playlist_service.create_playlist(
        db=db,
        name=payload.name,
        owner_id=user_id,
        public=payload.public,
        invited_only_edit=payload.invited_only_edit,
    )


@router.get("/playlists", response_model=list[PlaylistRead])
async def list_playlists(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await playlist_service.get_user_playlists(db=db, user_id=user_id)


@router.get("/playlists/{playlist_id}", response_model=PlaylistRead)
async def get_playlist(
    playlist_id: int,
    db: AsyncSession = Depends(get_db),
    _user_id: uuid.UUID = Depends(get_current_user_id),
):
    playlist = await playlist_service.get_playlist_by_id(db=db, playlist_id=playlist_id)
    if playlist is None:
        raise BaseVitrolifyException(
            error_code="PLAYLIST_NOT_FOUND",
            message="Playlist nao encontrada",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    active_device_str = await get_active_device(playlist_id)
    playlist.active_device_id = active_device_str
    playlist.active_device_name = None

    if active_device_str:
        try:
            device_uuid = uuid.UUID(active_device_str)
            result = await db.execute(
                select(Device.name).where(Device.id == device_uuid)
            )
            playlist.active_device_name = result.scalar_one_or_none()
        except ValueError:
            pass

    return playlist


@router.patch("/playlists/{playlist_id}", response_model=PlaylistRead)
async def update_playlist(
    playlist_id: int,
    payload: PlaylistUpdate,
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
    if playlist.owner_id != user_id:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # Extrai o dicionário validado do Pydantic
    update_data = payload.model_dump(exclude_unset=True)

    return await playlist_service.update_playlist(
        db=db, playlist=playlist, update_data=update_data
    )


@router.delete("/playlists/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(
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
    if playlist.owner_id != user_id:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    await playlist_service.delete_playlist(db=db, playlist=playlist)
