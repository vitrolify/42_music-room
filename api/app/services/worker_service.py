import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue, PlaylistEventType
from app.services.event_handlers import (
    add_handler,
    delete_handler,
    move_handler,
    playback_handler,
    skip_handler,
)

logger = logging.getLogger(__name__)

# O dicionário agora aponta para as funções de outros arquivos
EVENT_HANDLERS = {
    PlaylistEventType.add: add_handler.process_add_track_event,
    PlaylistEventType.move: move_handler.process_move_track,
    PlaylistEventType.skip: skip_handler.process_skip_track,
    PlaylistEventType.ended: skip_handler.process_skip_track,
    PlaylistEventType.pause: playback_handler.process_playback_event,
    PlaylistEventType.play: playback_handler.process_playback_event,
    PlaylistEventType.delete: delete_handler.process_delete_track,
}


async def dispatch_event(db: AsyncSession, event: EventQueue) -> None:
    if event.playlist_id is None:
        logger.error(
            "Worker dispatch failed: missing playlist_id (event_id=%s, event_type=%s)",
            event.id,
            event.event,
        )
        return

    handler = EVENT_HANDLERS.get(event.event)
    if not handler:
        logger.error(
            "Worker unsupported event type (event_id=%s, event_type=%s)",
            event.id,
            event.event,
        )
        return

    logger.info(
        "Worker dispatching event %s (%s)",
        event.id,
        event.event,
    )
    await handler(db, event, event.playlist_id)
