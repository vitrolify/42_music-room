import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user, get_current_user_id
from app.db.session import get_db
from app.models.friend import FriendRequestStatus
from app.schemas.user import PublicUserRead, UserResponse, UserUpdate
from app.services import friend_service
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    request: Request,
    auth_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    service = UserService(db)
    user = await service.get_or_create(
        firebase_uid=auth_user["uid"],
        email=auth_user.get("email"),
        display_name=auth_user.get("name"),
    )
    request.state.user_id = user.id
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    data: UserUpdate,
    request: Request,
    auth_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    service = UserService(db)
    user = await service.get_or_create(
        firebase_uid=auth_user["uid"],
        email=auth_user.get("email"),
        display_name=auth_user.get("name"),
    )
    request.state.user_id = user.id
    updated = await service.update(user, data)
    return UserResponse.model_validate(updated)


@router.get("/{user_id}", response_model=PublicUserRead)
async def get_public_profile(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
) -> PublicUserRead:
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if user is None:
        raise BaseVitrolifyException(
            error_code="USER_NOT_FOUND",
            message="Usuario nao encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    friendship = await friend_service.get_friendship(
        db, user_id=current_user_id, other_id=user_id
    )
    return PublicUserRead(
        id=user.id,
        display_name=user.display_name,
        avatar=user.avatar,
        is_friend=(
            friendship is not None
            and friendship.status == FriendRequestStatus.ACCEPTED
        ),
    )
