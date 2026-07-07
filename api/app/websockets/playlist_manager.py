import logging
import uuid

from app.websockets.base_manager import BaseConnectionManager

logger = logging.getLogger(__name__)


class PlaylistConnectionManager(BaseConnectionManager):
    def _get_room_id(self, playlist_id: int) -> str:
        return f"playlist_{playlist_id}"

    async def connect_to_playlist(
        self, websocket, playlist_id: int, user_id: uuid.UUID
    ):
        await self.connect(websocket, self._get_room_id(playlist_id), user_id)

    def disconnect_from_playlist(self, websocket, playlist_id: int, user_id: uuid.UUID):
        self.disconnect(websocket, self._get_room_id(playlist_id), user_id)

    async def broadcast_playlist_update(
        self, playlist_id: int, message: dict, user: dict
    ):
        """
        Sends a JSON with the update to all users currently editing the playlist
        """
        room_id = self._get_room_id(playlist_id)

        if room_id in self.active_connections:
            connections = list(self.active_connections[room_id])

            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(
                        {
                            "event": "websocket_messaging",
                            "user": user.id,
                            "room": room_id,
                            "msg": str(e),
                        }
                    )
                    # Disconnect problematic connection
                    self.disconnect(connection, room_id)


playlist_ws_manager = PlaylistConnectionManager()
