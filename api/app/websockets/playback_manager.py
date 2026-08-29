import asyncio
import json
import logging
import uuid

from app.db.redis import redis_client

logger = logging.getLogger(__name__)


class PlaybackConnectionManager:
    def __init__(self):
        self.connections: dict[str, set] = {}
        self.listener_task: asyncio.Task | None = None

    async def connect(self, websocket, user_id: uuid.UUID):
        if self.listener_task is None:
            self.listener_task = asyncio.create_task(self.listen())
        await websocket.accept()
        self.connections.setdefault(str(user_id), set()).add(websocket)

    def disconnect(self, websocket, user_id: uuid.UUID):
        room = self.connections.get(str(user_id))
        if room:
            room.discard(websocket)
            if not room:
                self.connections.pop(str(user_id), None)

    async def publish(self, user_id: uuid.UUID, message: dict):
        await redis_client.publish(f"playback_{user_id}", json.dumps(message, default=str))

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
