import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.session import get_db
from app.models.friend import FriendRequestStatus
from app.schemas.friend import (
    FriendRequestByEmailCreate,
    FriendRequestIncomingRead,
    FriendRequestOutgoingRead,
    FriendRequestRead,
    FriendUserRead,
)
from app.services import friend_service
from app.services.user_service import UserService

router = APIRouter(tags=["friends"])


@router.post(
    "/friends/requests/by-email",
    response_model=FriendRequestRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_friend_request_by_email(
    payload: FriendRequestByEmailCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    user_service = UserService(db)
    addressee = await user_service.get_by_email(payload.email)
    if addressee is None:
        raise BaseVitrolifyException(
            error_code="USER_NOT_FOUND",
            message="Usuario nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if addressee.id == user_id:
        raise BaseVitrolifyException(
            error_code="FRIEND_SELF",
            message="Voce nao pode se adicionar",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    existing = await friend_service.get_friendship(db, user_id, addressee.id)
    if existing is not None:
        if existing.status == FriendRequestStatus.ACCEPTED:
            raise BaseVitrolifyException(
                error_code="FRIEND_ALREADY_FRIENDS",
                message="Voce ja e amigo deste usuario",
                status_code=status.HTTP_409_CONFLICT,
            )
        if existing.status == FriendRequestStatus.PENDING:
            if existing.addressee_id == user_id:
                raise BaseVitrolifyException(
                    error_code="FRIEND_INCOMING_PENDING",
                    message="Este usuario ja te enviou um pedido",
                    status_code=status.HTTP_409_CONFLICT,
                )
            raise BaseVitrolifyException(
                error_code="FRIEND_DUPLICATE",
                message="Pedido de amizade ja enviado",
                status_code=status.HTTP_409_CONFLICT,
            )
        if existing.requester_id == user_id:
            return await friend_service.update_friend_request_status(
                db=db,
                friend_request=existing,
                status=FriendRequestStatus.PENDING,
            )

    return await friend_service.create_friend_request_in_db(
        db=db, requester_id=user_id, addressee_id=addressee.id
    )


@router.get("/friends/requests", response_model=list[FriendRequestIncomingRead])
async def list_incoming_requests(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    rows = await friend_service.get_incoming_requests_for_user(db, user_id=user_id)
    return [
        {
            "id": request.id,
            "requester_id": request.requester_id,
            "addressee_id": request.addressee_id,
            "status": request.status,
            "created_at": request.created_at,
            "updated_at": request.updated_at,
            "requester": requester,
        }
        for request, requester in rows
    ]


@router.get(
    "/friends/requests/outgoing",
    response_model=list[FriendRequestOutgoingRead],
)
async def list_outgoing_requests(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    rows = await friend_service.get_outgoing_requests_for_user(db, user_id=user_id)
    return [
        {
            "id": request.id,
            "requester_id": request.requester_id,
            "addressee_id": request.addressee_id,
            "status": request.status,
            "created_at": request.created_at,
            "updated_at": request.updated_at,
            "addressee": addressee,
        }
        for request, addressee in rows
    ]


@router.get("/friends", response_model=list[FriendUserRead])
async def list_friends(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await friend_service.get_friends_for_user(db, user_id=user_id)


@router.delete(
    "/friends/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_friend(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    removed = await friend_service.delete_friendship(
        db, user_id=current_user_id, friend_id=user_id
    )
    if not removed:
        raise BaseVitrolifyException(
            error_code="FRIEND_NOT_FOUND",
            message="Amizade nao encontrada",
            status_code=status.HTTP_404_NOT_FOUND,
        )


@router.patch(
    "/friends/requests/{request_id}/accept",
    response_model=FriendRequestRead,
)
async def accept_friend_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    request = await friend_service.get_friend_request_by_id(db, request_id=request_id)

    if request is None:
        raise BaseVitrolifyException(
            error_code="FRIEND_REQUEST_NOT_FOUND",
            message="Pedido de amizade nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if request.addressee_id != user_id:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if request.status != FriendRequestStatus.PENDING:
        raise BaseVitrolifyException(
            error_code="FRIEND_ALREADY_RESPONDED",
            message="Pedido de amizade ja foi respondido",
            status_code=status.HTTP_409_CONFLICT,
        )

    return await friend_service.update_friend_request_status(
        db=db, friend_request=request, status=FriendRequestStatus.ACCEPTED
    )


@router.patch(
    "/friends/requests/{request_id}/decline",
    response_model=FriendRequestRead,
)
async def decline_friend_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    request = await friend_service.get_friend_request_by_id(db, request_id=request_id)

    if request is None:
        raise BaseVitrolifyException(
            error_code="FRIEND_REQUEST_NOT_FOUND",
            message="Pedido de amizade nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if request.addressee_id != user_id:
        raise BaseVitrolifyException(
            error_code="FORBIDDEN",
            message="Forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if request.status != FriendRequestStatus.PENDING:
        raise BaseVitrolifyException(
            error_code="FRIEND_ALREADY_RESPONDED",
            message="Pedido de amizade ja foi respondido",
            status_code=status.HTTP_409_CONFLICT,
        )

    return await friend_service.update_friend_request_status(
        db=db, friend_request=request, status=FriendRequestStatus.DECLINED
    )