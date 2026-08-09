import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.friend import FriendRequestStatus
from app.models.user import Avatar


class FriendRequestByEmailCreate(BaseModel):
    email: str


class FriendRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester_id: uuid.UUID
    addressee_id: uuid.UUID
    status: FriendRequestStatus
    created_at: datetime
    updated_at: datetime


class FriendUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None = None
    display_name: str | None = None
    avatar: Avatar


class FriendRequestIncomingRead(FriendRequestRead):
    requester: FriendUserRead


class FriendRequestOutgoingRead(FriendRequestRead):
    addressee: FriendUserRead