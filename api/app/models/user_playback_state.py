import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Enum as SAEnum

from app.db.base import Base


class PlaybackStatus(str, enum.Enum):
    PLAYING = "playing"
    PAUSED = "paused"


class UserPlaybackState(Base):
    __tablename__ = "user_playback_states"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    video_id: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[PlaybackStatus] = mapped_column(
        SAEnum(
            PlaybackStatus,
            name="playback_status_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    position_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    controller_session_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True
    )
    active_playlist_id: Mapped[int | None] = mapped_column(
        ForeignKey("playlists.id", ondelete="SET NULL"), nullable=True
    )
    active_playlist_track_id: Mapped[int | None] = mapped_column(
        ForeignKey("playlist_track.id", ondelete="SET NULL"), nullable=True
    )
    controller_device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
