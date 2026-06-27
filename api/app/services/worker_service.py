import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue, PlaylistEventType
from app.services.event_handlers import add_handler

logger = logging.getLogger(__name__)

# O dicionário agora aponta para as funções de outros arquivos
EVENT_HANDLERS = {
    PlaylistEventType.add: add_handler.process_add_track_event,
}


async def dispatch_event(db: AsyncSession, event: EventQueue) -> None:
    handler = EVENT_HANDLERS.get(event.event)
    if not handler:
        logger.error(
            {
                "event": "worker_unsupported_event_type",
                "event_id": event.id,
                "event_type": event.event,
            }
        )
        return
    logger.info(
        {
            "event": "worker_dispatching",
            "event_id": event.id,
            "event_type": event.event,
        }
    )
    await handler(db, event)
