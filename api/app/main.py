from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import setup_exception_handlers, throw_exception
from app.api.v1.endpoints import playback
from app.api.v1.router import api_router
from app.api.v1.ws import playlists as ws_playlists
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.redis import close_redis
from app.middleware.action_logging import UserActionMiddleware
from app.observability.metrics import setup_metrics

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup phase ---
    yield
    # --- Shutdown phase ---
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(UserActionMiddleware)
setup_exception_handlers(app)
setup_metrics(app)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Vitrolify on"}


@app.get("/error")
def error() -> dict[str, str]:
    throw_exception()
    return {"message": "Never here"}


app.include_router(ws_playlists.router)
app.include_router(playback.ws_router)
app.include_router(api_router, prefix="/api/v1")
