from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.user import Avatar


class UserCreate(BaseModel):
    firebase_uid: str
    email: str | None = None
    display_name: str | None = None
    avatar: Avatar = Avatar.VINIL


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar: Avatar | None = None


class UserResponse(BaseModel):
    id: UUID
    firebase_uid: str
    email: str | None = None
    display_name: str | None = None
    avatar: Avatar
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PublicUserRead(BaseModel):
    id: UUID
    display_name: str | None = None
    avatar: Avatar

    model_config = {"from_attributes": True}
