import logging

from fastapi import FastAPI, Header

from app.api.error_handlers import setup_exception_handlers, throw_exception
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.action_logging import UserActionMiddleware
from app.observability.metrics import setup_metrics

setup_logging()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
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


# ---------------------------------------------------------------------------
# ENDPOINT DE DEBUG TEMPORÁRIO — remover antes de commitar a T012.
# Serve para confirmar duas coisas ao mesmo tempo:
#   1. O token Bearer está chegando no FastAPI (prova que a requisição chegou).
#   2. O FirebaseTokenVerifier da T012 consegue decodificar o token (prova que
#      a T012 funciona).
# ---------------------------------------------------------------------------
@app.get("/debug/auth")
def debug_auth(authorization: str | None = Header(default=None)) -> dict:
    logger = logging.getLogger("debug.auth")

    if not authorization:
        return {"step": "header", "ok": False, "reason": "no Authorization header"}

    if not authorization.lower().startswith("bearer "):
        return {
            "step": "scheme",
            "ok": False,
            "got": authorization.split()[0] if authorization else None,
        }

    token = authorization.split(" ", 1)[1]
    logger.info(
        "token received len=%s preview=%s...%s",
        len(token),
        token[:20],
        token[-10:],
    )

    try:
        from app.auth.firebase_auth import get_firebase_token_verifier

        claims = get_firebase_token_verifier().verify(token)
    except Exception as exc:  # noqa: BLE001 — debug endpoint, surface anything
        return {
            "step": "verify",
            "ok": False,
            "received": True,
            "token_length": len(token),
            "error_type": type(exc).__name__,
            "error_message": str(exc),
        }

    return {
        "step": "verified",
        "ok": True,
        "user_id": claims.get("user_id") or claims.get("sub"),
        "email": claims.get("email"),
        "name": claims.get("name"),
        "claims_keys": sorted(claims.keys()),
    }


app.include_router(api_router, prefix="/api/v1")
