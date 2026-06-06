"""Verificador de tokens do Firebase (T012)."""

import firebase_admin
from firebase_admin import auth, credentials

from app.core.config import settings

# App Firebase, inicializado uma vez por processo na primeira chamada
_app: firebase_admin.App | None = None


def _get_app() -> firebase_admin.App:
    global _app
    if _app is None:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        _app = firebase_admin.initialize_app(
            cred,
            {"projectId": settings.firebase_project_id},
        )
    return _app


class FirebaseTokenVerifier:
    """Recebe um JWT do Firebase, valida e devolve os claims."""

    def verify(self, token: str) -> dict:
        return auth.verify_id_token(token, app=_get_app())


def get_firebase_token_verifier() -> FirebaseTokenVerifier:
    return FirebaseTokenVerifier()
