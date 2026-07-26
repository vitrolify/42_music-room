import uuid
from uuid import UUID

from pydantic import BaseModel, ConfigDict

# Importamos o Enum diretamente do seu modelo para manter a consistência
from app.models.playlist_track import TrackPlaybackStatus
from app.schemas.track_info import TrackInfoRead


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


class PlaylistTrackRead(BaseModel):
    id: int
    playlist_id: int
    track_info_id: str
    user_id: uuid.UUID | None = None
    status: TrackPlaybackStatus
    position: int

    # ---> ADICIONE ESTA LINHA <---
    # Isso diz ao FastAPI para serializar o relacionamento carregado pelo joinedload
    track_info: TrackInfoRead

    model_config = ConfigDict(from_attributes=True)
