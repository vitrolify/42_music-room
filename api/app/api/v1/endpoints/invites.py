import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.session import get_db
from app.models.invite import InviteStatus
from app.schemas.invite import (
    InviteByEmailCreate,
    InviteCreate,
    InviteRead,
    InviteWithPlaylistRead,
    InviteWithUserRead,
)
from app.services import invite_service, playlist_service
from app.services.user_service import UserService

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
    if payload.user_id == user_id:
        raise BaseVitrolifyException(
            error_code="INVITE_SELF",
            message="Voce nao pode se convidar",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        return await invite_service.create_invite_in_db(
            db=db, user_id=payload.user_id, playlist_id=playlist_id
        )
    except IntegrityError:
        await db.rollback()
        raise BaseVitrolifyException(
            error_code="INVITE_DUPLICATE",
            message="Usuario ja foi convidado",
            status_code=status.HTTP_409_CONFLICT,
        )


@router.post(
    "/playlists/{playlist_id}/invites/by-email",
    response_model=InviteRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_invite_by_email(
    playlist_id: int,
    payload: InviteByEmailCreate,
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

    user_service = UserService(db)
    invited_user = await user_service.get_by_email(payload.email)
    if invited_user is None:
        raise BaseVitrolifyException(
            error_code="USER_NOT_FOUND",
            message="Usuario nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if invited_user.id == user_id:
        raise BaseVitrolifyException(
            error_code="INVITE_SELF",
            message="Voce nao pode se convidar",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        return await invite_service.create_invite_in_db(
            db=db, user_id=invited_user.id, playlist_id=playlist_id
        )
    except IntegrityError:
        await db.rollback()
        raise BaseVitrolifyException(
            error_code="INVITE_DUPLICATE",
            message="Usuario ja foi convidado",
            status_code=status.HTTP_409_CONFLICT,
        )


@router.get(
    "/invites/mine",
    response_model=list[InviteWithPlaylistRead],
)
async def list_my_invites(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    rows = await invite_service.get_invites_with_playlists_for_user(
        db=db, user_id=user_id
    )
    return [
        {
            "id": invite.id,
            "user_id": invite.user_id,
            "playlist_id": invite.playlist_id,
            "status": invite.status,
            "created_at": invite.created_at,
            "updated_at": invite.updated_at,
            "playlist": playlist,
            "owner": owner,
        }
        for invite, playlist, owner in rows
    ]


@router.get(
    "/playlists/{playlist_id}/invites",
    response_model=list[InviteWithUserRead],
)
async def list_invites(
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

    rows = await invite_service.get_invites_with_users_by_playlist(
        db=db, playlist_id=playlist_id
    )
    return [
        {
            "id": invite.id,
            "user_id": invite.user_id,
            "playlist_id": invite.playlist_id,
            "status": invite.status,
            "created_at": invite.created_at,
            "updated_at": invite.updated_at,
            "user": user,
        }
        for invite, user in rows
    ]


@router.patch("/invites/{invite_id}/accept", response_model=InviteRead)
async def accept_invite(
    invite_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    invite = await invite_service.get_invite_by_id(db=db, invite_id=invite_id)

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

    return await invite_service.update_invite_status(
        db=db, invite=invite, status=InviteStatus.ACCEPTED
    )


@router.patch("/invites/{invite_id}/decline", response_model=InviteRead)
async def decline_invite(
    invite_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    invite = await invite_service.get_invite_by_id(db=db, invite_id=invite_id)

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

    return await invite_service.update_invite_status(
        db=db, invite=invite, status=InviteStatus.DECLINED
    )


@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invite(
    invite_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    invite = await invite_service.get_invite_by_id(db=db, invite_id=invite_id)
    if invite is None:
        raise BaseVitrolifyException(
            error_code="INVITE_NOT_FOUND",
            message="Invite nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    playlist = await playlist_service.get_playlist_by_id(
        db=db, playlist_id=invite.playlist_id
    )
    if user_id != invite.user_id and user_id != playlist.owner_id:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    await invite_service.delete_invite_in_db(db=db, invite=invite)
