from uuid import UUID

from pydantic import BaseModel, ConfigDict

# Importamos o Enum diretamente do seu modelo para manter a consistência
from app.models.playlist_track import TrackPlaybackStatus


class PlaylistTrackBase(BaseModel):
    track_info_id: str | None = None
    user_id: UUID | None = None
    status: TrackPlaybackStatus = TrackPlaybackStatus.queued
    position: int


class PlaylistTrackCreate(PlaylistTrackBase):
    playlist_id: int


class PlaylistTrackUpdate(BaseModel):
    position: int | None = None
    status: TrackPlaybackStatus | None = None


class PlaylistTrackRead(PlaylistTrackBase):
    id: int
    playlist_id: int
    model_config = ConfigDict(from_attributes=True)
