import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Enum as SAEnum

from app.db.base import Base


class Avatar(str, enum.Enum):
    VINIL = "vinil"
    TAPE = "tape"
    GLOBE = "globe"
    ET = "et"
    CAT = "cat"
    OWL = "owl"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    firebase_uid: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    display_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    avatar: Mapped[Avatar] = mapped_column(
        SAEnum(
            Avatar,
            name="avatar_enum",
            create_type=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=Avatar.VINIL,
        server_default=Avatar.VINIL.value,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    added_tracks: Mapped[list["PlaylistTrack"]] = relationship(back_populates="user")
    my_playlists: Mapped[list["Playlist"]] = relationship(back_populates="owner")
