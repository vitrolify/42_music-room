from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    auth_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    service = UserService(db)
    user = await service.get_or_create(
        firebase_uid=auth_user["uid"],
        email=auth_user.get("email"),
        display_name=auth_user.get("name"),
    )
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    data: UserUpdate,
    auth_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    service = UserService(db)
    user = await service.get_or_create(
        firebase_uid=auth_user["uid"],
        email=auth_user.get("email"),
        display_name=auth_user.get("name"),
    )
    updated = await service.update(user, data)
    return UserResponse.model_validate(updated)
