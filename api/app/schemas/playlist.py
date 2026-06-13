import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PlaylistCreate(BaseModel):
    name: str
    public: bool = True
    invited_only_edit: bool = False


class PlaylistUpdate(BaseModel):
    name: str | None = None
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
