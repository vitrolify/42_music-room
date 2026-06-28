"""Verificador de tokens do Firebase (T012)."""

import firebase_admin
from firebase_admin import auth, credentials

from app.core.config import settings


def _get_app() -> firebase_admin.App:
    try:
        return firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        return firebase_admin.initialize_app(
            cred,
            {"projectId": settings.firebase_project_id},
        )


class FirebaseTokenVerifier:
    """Recebe um JWT do Firebase, valida e devolve os claims."""

    def verify(self, token: str) -> dict:
        return auth.verify_id_token(token, app=_get_app())


def get_firebase_token_verifier() -> FirebaseTokenVerifier:
    return FirebaseTokenVerifier()
