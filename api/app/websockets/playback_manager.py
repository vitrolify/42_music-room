import asyncio
import json
import logging
import uuid

from app.db.redis import redis_client

logger = logging.getLogger(__name__)


class PlaybackConnectionManager:
    def __init__(self):
        self.connections: dict[str, set] = {}
        self.connection_metadata: dict[object, tuple[str, str, uuid.UUID | None]] = {}
        self.listener_task: asyncio.Task | None = None

    async def connect(
        self,
        websocket,
        room_owner_id: uuid.UUID,
        viewer_id: uuid.UUID,
        controller_device_id: uuid.UUID | None = None,
    ):
        if self.listener_task is None:
            self.listener_task = asyncio.create_task(self.listen())
        await websocket.accept()
        room = str(room_owner_id)
        self.connections.setdefault(room, set()).add(websocket)
        self.connection_metadata[websocket] = (
            room,
            str(viewer_id),
            controller_device_id,
        )

    def disconnect(self, websocket, room_owner_id: uuid.UUID):
        room = self.connections.get(str(room_owner_id))
        if room:
            room.discard(websocket)
            if not room:
                self.connections.pop(str(room_owner_id), None)
        self.connection_metadata.pop(websocket, None)

    async def close_delegate(
        self, room_owner_id: uuid.UUID, delegate_id: uuid.UUID, device_id: uuid.UUID
    ):
        room = self.connections.get(str(room_owner_id), set())
        for connection in list(room):
            metadata = self.connection_metadata.get(connection)
            if metadata and metadata[1:] == (str(delegate_id), device_id):
                try:
                    await connection.close(
                        code=1008, reason="Playback delegation revoked"
                    )
                except Exception:
                    pass
                self.disconnect(connection, room_owner_id)

    async def publish(self, user_id: uuid.UUID, message: dict):
        await redis_client.publish(
            f"playback_{user_id}",
            json.dumps(message, default=str),
        )

    async def listen(self):
        pubsub = redis_client.pubsub()
        await pubsub.psubscribe("playback_*")
        try:
            async for message in pubsub.listen():
                if message.get("type") != "pmessage":
                    continue
                user_id = message["channel"].removeprefix("playback_")
                for connection in list(self.connections.get(user_id, set())):
                    try:
                        await connection.send_text(message["data"])
                    except Exception:
                        self.connections.get(user_id, set()).discard(connection)
        except asyncio.CancelledError:
            await pubsub.punsubscribe("playback_*")
        except Exception:
            logger.exception("Playback Redis listener failed")


playback_ws_manager = PlaybackConnectionManager()
