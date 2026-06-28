import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.invite import InviteStatus


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
