import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websockets.playlist_manager import playlist_ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/playlists", tags=["websockets"])


@router.websocket("/{playlist_id}")
async def playlist_websocket_endpoint(websocket: WebSocket, playlist_id: int):
    await playlist_ws_manager.connect_to_playlist(websocket, playlist_id)

    try:
        while True:
            _ = await websocket.receive_text()

    except WebSocketDisconnect:
        playlist_ws_manager.disconnect_from_playlist(websocket, playlist_id)

    except Exception as e:
        logger.error(
            {
                "event": "websocket_connecting",
                "user": "42",
                "room": playlist_id,
                "msg": str(e),
            }
        )
        playlist_ws_manager.disconnect_from_playlist(websocket, playlist_id)
