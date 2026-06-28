# To deal with ruff lint checking
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.playlist import Playlist
    from app.models.user import User

import uuid
from enum import Enum

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TrackPlaybackStatus(str, Enum):
    played = "played"
    queued = "queued"
    playing = "playing"


class PlaylistTrack(Base):
    __tablename__: str = "playlist_track"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # ForeignKeys
    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False
    )
    track_info_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # TrackInfo
    status: Mapped[TrackPlaybackStatus] = mapped_column(
        ENUM(TrackPlaybackStatus, name="track_playback_status", create_type=True),
        nullable=False,
        default=TrackPlaybackStatus.queued,
    )
    position: Mapped[int] = mapped_column(nullable=False)

    # Relationships
    playlist: Mapped["Playlist"] = relationship(back_populates="tracks")
    user: Mapped["User | None"] = relationship(back_populates="added_tracks")

    # Optimizations and Constraints
    __table_args__ = (
        CheckConstraint("position > 0", name="chk_positive_position"),
        UniqueConstraint("playlist_id", "position", name="uq_playlist_position"),
        Index("idx_playlist_track_query", "playlist_id", "position"),
    )
