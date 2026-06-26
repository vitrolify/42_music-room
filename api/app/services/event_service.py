import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue, PlaylistEventType


async def create_event_in_db(
    db: AsyncSession,
    playlist_id: int,
    user_id: uuid.UUID,
    event_type: PlaylistEventType,
    track_info_id: str | None,
    payload: dict[str, Any],
) -> EventQueue:

    new_event = EventQueue(
        playlist_id=playlist_id,
        user_id=user_id,
        event=event_type,
        track_info_id=track_info_id,
        payload=payload,
    )

    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)

    return new_event
