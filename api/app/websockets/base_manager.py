import logging
import uuid

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class BaseConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, set[WebSocket]] = {}
        self.connection_user_map: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: uuid.UUID):
        await websocket.accept()

        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()

        self.active_connections[room_id].add(websocket)
        self.connection_user_map[websocket] = str(user_id)
        logger.info(
            "WebSocket connected (room=%s, user=%s, connections=%d)",
            room_id,
            user_id,
            len(self.active_connections[room_id]),
        )

    def disconnect(self, websocket: WebSocket, room_id: str, user_id: uuid.UUID):
        if room_id in self.active_connections:
            try:
                self.active_connections[room_id].discard(websocket)
                self.connection_user_map.pop(websocket, None)
                logger.info(
                    "WebSocket disconnected (room=%s, user=%s, connections=%d)",
                    room_id,
                    user_id,
                    len(self.active_connections[room_id]),
                )

                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]
            except ValueError:
                pass
