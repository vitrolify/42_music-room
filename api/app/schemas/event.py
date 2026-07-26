import re
import uuid  # Add this import at the top
from datetime import datetime
from typing import Annotated, Literal, Union
from urllib.parse import parse_qs, urlparse

from fastapi import status
from pydantic import BaseModel, ConfigDict, Field, PositiveInt, field_validator

from app.api.error_handlers import BaseVitrolifyException
from app.models.event_queue import PlaylistEventType


class MovePayload(BaseModel):
    playlist_track_id: int
    current_position: PositiveInt
    new_position: PositiveInt


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

        parsed = urlparse(value)
        host = parsed.netloc.lower().removeprefix("www.")
        candidate = None
        if host in {"youtube.com", "m.youtube.com"}:
            candidate = parse_qs(parsed.query).get("v", [None])[0]
            if parsed.path.startswith(("/shorts/", "/embed/")):
                candidate = parsed.path.split("/")[2]
        elif host == "youtu.be":
            candidate = parsed.path.strip("/").split("/")[0]

        if candidate and re.fullmatch(r"[a-zA-Z0-9_-]{11}", candidate):
            return candidate

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


class TrackDeleteEvent(PlaybackPayload):
    event: Literal[PlaylistEventType.delete]


EventCreate = Annotated[
    Union[
        TrackAddEvent,
        TrackMoveEvent,
        TrackSkipEvent,
        TrackPlayEvent,
        TrackPauseEvent,
        TrackDeleteEvent,
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
