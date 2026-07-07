import logging
import uuid

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class BaseConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: uuid.UUID):
        await websocket.accept()

        if room_id not in self.active_connections:
            self.active_connections[room_id] = []

        self.active_connections[room_id].append(websocket)
        logger.info(
            {
                "event": "playlist_websocket_connection",
                "user": user_id,
                "room": room_id,
                "current_connections": len(self.active_connections[room_id]),
            }
        )

    def disconnect(self, websocket: WebSocket, room_id: str, user_id: uuid.UUID):
        if room_id in self.active_connections:
            try:
                self.active_connections[room_id].remove(websocket)
                logger.info(
                    {
                        "event": "playlist_websocket_disconnection",
                        "user": user_id,
                        "room": room_id,
                        "current_connections": len(self.active_connections[room_id]),
                    }
                )

                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]
            except ValueError:
                pass
