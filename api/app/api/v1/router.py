from fastapi import APIRouter

from app.api.v1.endpoints import health, invites, playlist_tracks, playlists, users

api_router = APIRouter()

api_router.include_router(
    health.router,
    tags=["health"],
)

api_router.include_router(users.router)
api_router.include_router(playlists.router)
api_router.include_router(invites.router)
api_router.include_router(playlist_tracks.router)
