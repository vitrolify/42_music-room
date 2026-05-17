"""Verificador de tokens do Firebase (T012)."""

import os

import firebase_admin
from firebase_admin import auth, credentials

# App Firebase, inicializado uma vez por processo na primeira chamada
_app: firebase_admin.App | None = None


def _get_app() -> firebase_admin.App:
    global _app
    if _app is None:
        cred = credentials.Certificate(os.environ["FIREBASE_CREDENTIALS_PATH"])
        _app = firebase_admin.initialize_app(
            cred,
            {"projectId": os.environ["FIREBASE_PROJECT_ID"]},
        )
    return _app


class FirebaseTokenVerifier:
    """Recebe um JWT do Firebase, valida e devolve os claims."""

    def verify(self, token: str) -> dict:
        return auth.verify_id_token(token, app=_get_app())


def get_firebase_token_verifier() -> FirebaseTokenVerifier:
    return FirebaseTokenVerifier()
