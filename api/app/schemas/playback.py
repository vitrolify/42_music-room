import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.user_playback_state import PlaybackStatus


class PlaybackStateRead(BaseModel):
    video_id: str
    status: PlaybackStatus
    position_seconds: float
    duration_seconds: float
    version: int
    controller_session_id: str | None
    active_playlist_id: int | None
    active_playlist_track_id: int | None
    controller_device_id: uuid.UUID | None
    updated_at: datetime


class PlaybackCommand(BaseModel):
    command: str = Field(pattern="^(load|play|pause|seek|checkpoint)$")
    video_id: str | None = Field(default=None, max_length=32)
    position_seconds: float | None = Field(default=None, ge=0)
    duration_seconds: float | None = Field(default=None, ge=0)
    client_command_id: uuid.UUID | None = None
    session_id: str | None = Field(default=None, max_length=128)
    device_id: uuid.UUID | None = None
    expected_version: int | None = Field(default=None, ge=0)


class PlaylistPlaybackCommand(BaseModel):
    command: str = Field(pattern="^(play|pause|seek|checkpoint|skip|ended)$")
    playlist_track_id: int
    device_id: uuid.UUID
    session_id: str = Field(min_length=1, max_length=128)
    expected_version: int | None = Field(default=None, ge=0)
    position_seconds: float | None = Field(default=None, ge=0)
    duration_seconds: float | None = Field(default=None, ge=0)


class PlaybackEvent(BaseModel):
    type: str = "PLAYBACK_STATE_CHANGED"
    version: int
    payload: PlaybackStateRead
