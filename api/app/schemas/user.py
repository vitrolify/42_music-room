from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.user import Avatar, Visibility


class UserCreate(BaseModel):
    firebase_uid: str
    email: str | None = None
    display_name: str | None = None
    avatar: Avatar = Avatar.VINIL


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar: Avatar | None = None
    mini_bio: str | None = None
    favorite_artists: str | None = None
    favorite_genre: str | None = None
    profile_visibility: Visibility | None = None


class UserResponse(BaseModel):
    id: UUID
    firebase_uid: str
    email: str | None = None
    display_name: str | None = None
    avatar: Avatar
    mini_bio: str | None = None
    favorite_artists: str | None = None
    favorite_genre: str | None = None
    profile_visibility: Visibility = Visibility.PUBLIC
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PublicUserRead(BaseModel):
    id: UUID
    display_name: str | None = None
    avatar: Avatar
    email: str | None = None
    mini_bio: str | None = None
    favorite_artists: str | None = None
    favorite_genre: str | None = None
    is_self: bool = False
    is_friend: bool = False
    outgoing_request_pending: bool = False
    incoming_request_pending: bool = False
    request_id: int | None = None

    model_config = {"from_attributes": True}
