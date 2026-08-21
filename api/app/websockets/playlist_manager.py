import asyncio
import json
import logging
import uuid

from app.db.redis import redis_client
from app.websockets.base_manager import BaseConnectionManager

logger = logging.getLogger(__name__)


class PlaylistConnectionManager(BaseConnectionManager):
    def __init__(self):
        super().__init__()
        self._pubsub_task = None

    def _get_room_id(self, playlist_id: int) -> str:
        return f"playlist_{playlist_id}"

    async def connect_to_playlist(
        self, websocket, playlist_id: int, user_id: uuid.UUID
    ):
        if self._pubsub_task is None:
            self._pubsub_task = asyncio.create_task(self._listen_to_redis())
        await self.connect(websocket, self._get_room_id(playlist_id), user_id)

    def disconnect_from_playlist(self, websocket, playlist_id: int, user_id: uuid.UUID):
        self.disconnect(websocket, self._get_room_id(playlist_id), user_id)

    async def broadcast_playlist_update(
        self, playlist_id: int, message: dict, user_id: uuid.UUID | None
    ):
        """
        Publishes the JSON message to Redis so all Uvicorn workers can hear it.
        """
        room_id = self._get_room_id(playlist_id)
        await redis_client.publish(room_id, json.dumps(message))

    async def _listen_to_redis(self):
        """
        Runs continuously in the background, listening for Redis broadcasts.
        """
        pubsub = redis_client.pubsub()
        await pubsub.psubscribe("playlist_*")

        try:
            async for message in pubsub.listen():
                if message["type"] == "pmessage":
                    room_id = message["channel"]
                    data = message["data"]

                    if room_id in self.active_connections:
                        connections = list(self.active_connections[room_id])
                        for connection in connections:
                            try:
                                await connection.send_text(data)
                            except Exception as e:
                                logger.error(f"WS send error: {e}")
                                self.active_connections[room_id].discard(connection)
        except asyncio.CancelledError:
            await pubsub.punsubscribe("playlist_*")
        except Exception as e:
            logger.error(f"Redis PubSub listener failed: {e}")


playlist_ws_manager = PlaylistConnectionManager()
