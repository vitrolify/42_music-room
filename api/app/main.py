from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.action_logging import UserActionMiddleware
from app.api.error_handlers import setup_exception_handlers, throw_exception

setup_logging()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)
app.add_middleware(UserActionMiddleware)
setup_exception_handlers(app)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Vitrolify on"}


@app.get("/error")
def error() -> dict[str, str]:
    throw_exception()
    return {"message": "Never here"}


app.include_router(api_router, prefix="/api/v1")
