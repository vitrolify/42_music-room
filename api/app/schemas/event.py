import uuid  # Add this import at the top
from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

from app.models.event_queue import PlaylistEventType


class MovePayload(BaseModel):
    playlist_track_id: int
    current_position: int
    new_position: int


class TrackMoveEvent(MovePayload):
    event: Literal[PlaylistEventType.move]


class AddPayload(BaseModel):
    track_info_id: str


class TrackAddEvent(AddPayload):
    event: Literal[PlaylistEventType.add]


class SkipPayload(BaseModel):
    playlist_track_id: int


class TrackSkipEvent(SkipPayload):
    event: Literal[PlaylistEventType.skip]


EventCreate = Annotated[
    Union[TrackAddEvent, TrackMoveEvent, TrackSkipEvent], Field(discriminator="event")
]


class EventRead(BaseModel):
    id: int
    playlist_id: int
    user_id: uuid.UUID
    event: PlaylistEventType
    payload: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
