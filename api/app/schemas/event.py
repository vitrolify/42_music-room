import re
import uuid  # Add this import at the top
from datetime import datetime
from typing import Annotated, Literal, Union

from fastapi import status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.error_handlers import BaseVitrolifyException
from app.models.event_queue import PlaylistEventType


class MovePayload(BaseModel):
    playlist_track_id: int
    current_position: int
    new_position: int


class TrackMoveEvent(MovePayload):
    event: Literal[PlaylistEventType.move]


class AddPayload(BaseModel):
    track_info_id: str

    @field_validator("track_info_id")
    @classmethod
    def extract_youtube_id(cls, value: str) -> str:
        value = value.strip()

        if len(value) == 11 and re.match(r"^[a-zA-Z0-9_-]{11}$", value):
            return value

        pattern = r"youtube\.com/watch\?.*v=([a-zA-Z0-9_-]{11})"
        match = re.search(pattern, value)

        if match:
            return match.group(1)

        raise BaseVitrolifyException(
            error_code="INVALID_URL",
            message="Invalid URL. Use a youtube link or send the video ID directly",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class TrackAddEvent(AddPayload):
    event: Literal[PlaylistEventType.add]


class PlaybackPayload(BaseModel):
    playlist_track_id: int


class TrackSkipEvent(PlaybackPayload):
    event: Literal[PlaylistEventType.skip]


class TrackPlayEvent(PlaybackPayload):
    event: Literal[PlaylistEventType.play]


class TrackPauseEvent(PlaybackPayload):
    event: Literal[PlaylistEventType.pause]


EventCreate = Annotated[
    Union[
        TrackAddEvent, TrackMoveEvent, TrackSkipEvent, TrackPlayEvent, TrackPauseEvent
    ],
    Field(discriminator="event"),
]


class EventRead(BaseModel):
    id: int
    playlist_id: int
    user_id: uuid.UUID
    event: PlaylistEventType
    payload: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
