import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.session import get_db
from app.models.invite import Invite, InviteStatus
from app.models.playlist import Playlist
from app.schemas.invite import InviteCreate, InviteRead

router = APIRouter(tags=["invites"])


@router.post(
    "/playlists/{playlist_id}/invites",
    response_model=InviteRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_invite(
    playlist_id: int,
    payload: InviteCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    playlist = await db.get(Playlist, playlist_id)
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
    if payload.user_id == user_id:
        raise BaseVitrolifyException(
            error_code="INVITE_SELF",
            message="Voce nao pode se convidar",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    invite = Invite(
        user_id=payload.user_id,
        playlist_id=playlist_id,
        status=InviteStatus.PENDING,
    )
    db.add(invite)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise BaseVitrolifyException(
            error_code="INVITE_DUPLICATE",
            message="Usuario ja foi convidado",
            status_code=status.HTTP_409_CONFLICT,
        )
    await db.refresh(invite)
    return invite


@router.get(
    "/playlists/{playlist_id}/invites",
    response_model=list[InviteRead],
)
async def list_invites(
    playlist_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    playlist = await db.get(Playlist, playlist_id)
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

    result = await db.execute(select(Invite).where(Invite.playlist_id == playlist_id))
    return list(result.scalars().all())


@router.patch("/invites/{invite_id}/accept", response_model=InviteRead)
async def accept_invite(
    invite_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    invite = await db.get(Invite, invite_id)
    if invite is None:
        raise BaseVitrolifyException(
            error_code="INVITE_NOT_FOUND",
            message="Invite nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if invite.user_id != user_id:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if invite.status != InviteStatus.PENDING:
        raise BaseVitrolifyException(
            error_code="INVITE_ALREADY_RESPONDED",
            message="Convite ja foi respondido",
            status_code=status.HTTP_409_CONFLICT,
        )

    invite.status = InviteStatus.ACCEPTED
    await db.commit()
    await db.refresh(invite)
    return invite


@router.patch("/invites/{invite_id}/decline", response_model=InviteRead)
async def decline_invite(
    invite_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    invite = await db.get(Invite, invite_id)
    if invite is None:
        raise BaseVitrolifyException(
            error_code="INVITE_NOT_FOUND",
            message="Invite nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if invite.user_id != user_id:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if invite.status != InviteStatus.PENDING:
        raise BaseVitrolifyException(
            error_code="INVITE_ALREADY_RESPONDED",
            message="Convite ja foi respondido",
            status_code=status.HTTP_409_CONFLICT,
        )

    invite.status = InviteStatus.DECLINED
    await db.commit()
    await db.refresh(invite)
    return invite


@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invite(
    invite_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    invite = await db.get(Invite, invite_id)
    if invite is None:
        raise BaseVitrolifyException(
            error_code="INVITE_NOT_FOUND",
            message="Invite nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    playlist = await db.get(Playlist, invite.playlist_id)
    if user_id != invite.user_id and user_id != playlist.owner_id:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    await db.delete(invite)
    await db.commit()
