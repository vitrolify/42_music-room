import os
from threading import Lock

import firebase_admin
from firebase_admin import auth, credentials

from app.core.config import settings

_firebase_app_lock = Lock()


def _get_app() -> firebase_admin.App:
    try:
        return firebase_admin.get_app()
    except ValueError:
        with _firebase_app_lock:
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


class MockFirebaseVerifier:
    """A dummy verifier that bypasses Firebase for load testing."""

    def verify(self, token: str) -> dict:
        # Returns simulated claims based on the k6 token (e.g., "test-user-1")
        return {
            "sub": f"firebase_uid_{token}",
            "email": f"{token}@loadtest.local",
            "name": f"Simulated User {token}",
            "email_verified": True,
        }


def get_firebase_token_verifier() -> FirebaseTokenVerifier:
    if os.getenv("LOAD_TEST_MODE") == "True":
        return MockFirebaseVerifier()

    return FirebaseTokenVerifier()
