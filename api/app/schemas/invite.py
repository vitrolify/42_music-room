import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.invite import InviteStatus
from app.models.user import Avatar
from app.schemas.playlist import PlaylistRead


class InviteCreate(BaseModel):
    user_id: uuid.UUID


class InviteByEmailCreate(BaseModel):
    email: str


class InviteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: uuid.UUID
    playlist_id: int
    status: InviteStatus
    created_at: datetime
    updated_at: datetime


class InviteWithPlaylistRead(InviteRead):
    playlist: PlaylistRead


class InviteUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None = None
    display_name: str | None = None
    avatar: Avatar


class InviteWithUserRead(InviteRead):
    user: InviteUserRead
