import uuid  # Add this import at the top
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.event_queue import PlaylistEventType


class EventCreate(BaseModel):
    event: PlaylistEventType
    track_info_id: str | None = None
    payload: dict[str, Any] = {}


class EventRead(BaseModel):
    id: int
    playlist_id: int
    user_id: uuid.UUID
    event: PlaylistEventType
    track_info_id: str | None
    payload: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
