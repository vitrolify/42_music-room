from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.action_logging import UserActionMiddleware

setup_logging()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(UserActionMiddleware)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Vitrolify on"}


app.include_router(api_router, prefix="/api/v1")
