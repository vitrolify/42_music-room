# To deal with ruff lint checking
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.playlist import Playlist
    from app.models.user import User

from datetime import datetime
from enum import Enum
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlaylistEventType(str, Enum):
    play = "play"
    pause = "pause"
    add = "add"
    skip = "skip"
    move = "move"


class EventQueue(Base):
    __tablename__: str = "event_queues"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    playlist_id: Mapped[int | None] = mapped_column(
        ForeignKey("playlists.id", ondelete="SET NULL"), nullable=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # ADD TRACK_INFO RELATIONSHIP LATER
    track_info_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    event: Mapped[PlaylistEventType] = mapped_column(
        ENUM(PlaylistEventType, name="playlist_event_type", create_type=True),
        nullable=False,
    )

    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # --- ORM Relationships ---
    playlist: Mapped["Playlist | None"] = relationship(back_populates="events")
    user: Mapped["User | None"] = relationship(back_populates="events")
    # ADD TRACK_INFO RELATIONSHIP LATER

    __table_args__ = (
        Index("idx_event_queues_playlist_id", "playlist_id"),
        Index("idx_event_queues_created_at", "created_at"),
    )
