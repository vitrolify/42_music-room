import re
import uuid  # Add this import at the top
from datetime import datetime
from typing import Annotated, Dict, Literal, Union
from urllib.parse import parse_qs, urlparse

from fastapi import status
from fastapi.openapi.models import Example
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


EVENT_EXAMPLES: Dict[str, Example] = {
    "add_track": {
        "summary": "Add Track",
        "description": "Add a new video/track using a YouTube URL or video ID.",
        "value": {
            "event": "add",
            "track_info_id": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
    },
    "move_track": {
        "summary": "Move Track",
        "description": "Reorder a track to a new position in the queue.",
        "value": {
            "event": "move",
            "playlist_track_id": 42,
            "current_position": 1,
            "new_position": 3,
        },
    },
    "skip_track": {
        "summary": "Skip Track",
        "description": "Skip track playback.",
        "value": {
            "event": "skip",
            "playlist_track_id": 42,
        },
    },
    "play_track": {
        "summary": "Play Track",
        "value": {
            "event": "play",
            "playlist_track_id": 42,
        },
    },
    "pause_track": {
        "summary": "Pause Track",
        "value": {
            "event": "pause",
            "playlist_track_id": 42,
        },
    },
    "delete_track": {
        "summary": "Delete Track",
        "value": {
            "event": "delete",
            "playlist_track_id": 42,
        },
    },
}
