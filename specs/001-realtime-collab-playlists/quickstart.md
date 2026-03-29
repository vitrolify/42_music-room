# Quickstart - Realtime Collab Playlists

## 1. Prerequisites
- Docker and Docker Compose
- Node.js LTS (for Expo tooling)
- Python 3.11+
- Firebase project configured for Email/Password, Google, and Facebook sign-in
- YouTube Data API key (kept in environment variables, never in git)

## 2. Environment variables
Create local environment files (not committed):

- API container:
  - DATABASE_URL
  - FIREBASE_PROJECT_ID
  - FIREBASE_CLIENT_EMAIL (if admin SDK mode is needed)
  - FIREBASE_PRIVATE_KEY (escaped multiline)
  - YOUTUBE_DATA_API_KEY
  - LOG_LEVEL

- Mobile app:
  - EXPO_PUBLIC_API_BASE_URL
  - EXPO_PUBLIC_FIREBASE_API_KEY
  - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  - EXPO_PUBLIC_FIREBASE_PROJECT_ID
  - EXPO_PUBLIC_FIREBASE_APP_ID

## 3. Run services in containers
- Start backend + database:
  - docker compose up --build api db
- Optional realtime worker (if separated from api):
  - docker compose up --build realtime

## 4. Run mobile app (Expo)
- Install dependencies:
  - npm install
- Start development server:
  - npx expo start

## 5. Run backend tests (FastAPI TestClient)
- Command:
  - pytest -q

Test focus:
- Auth-required endpoint rejection when token missing/invalid
- Vote toggle semantics (1 active vote per user per track)
- Deterministic conflict tie-break ordering
- Invite/license enforcement for private and restricted resources

## 6. Run load testing with k6 in a dedicated container
Example flow (container starts and stops in the same command sequence):
- docker compose run --rm k6 run /scripts/vote_load.js

Recommended CI behavior:
- execute k6 stage against ephemeral test environment
- collect summary artifacts
- stop and remove k6 container after execution

## 7. CI pipeline outline (GitHub Actions)
Required jobs:
- lint-and-typecheck
- backend-tests (pytest with TestClient)
- contract-validation (OpenAPI schema checks)
- container-build
- optional-load-test (k6, branch or nightly gated)

Merge policy:
- Pull requests must pass all required jobs before merge.
