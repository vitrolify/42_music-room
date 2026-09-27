import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlaylistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    public: bool = True
    invited_only_edit: bool = False


class PlaylistUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    public: bool | None = None
    invited_only_edit: bool | None = None


class PlaylistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    owner_id: uuid.UUID
    public: bool
    invited_only_edit: bool
    created_at: datetime
    updated_at: datetime
    active_device_id: uuid.UUID | str | None = None
    active_device_name: str | None = None
