# Phase 0 Research - Realtime Collab Playlists

## Decision 1: Frontend stack and state model
- Decision: Use React Native with Expo and TypeScript as a thin client, without CSS frameworks.
- Rationale: Meets product constraints, keeps UI logic explicit, and aligns with mobile-as-remote principle from constitution.
- Alternatives considered: React Native CLI (more native control, higher setup cost); CSS-in-JS frameworks (rejected by explicit constraint).

## Decision 2: Backend API and realtime transport
- Decision: Use FastAPI for REST JSON endpoints and WebSocket channels for realtime queue/playlist updates.
- Rationale: FastAPI provides typed contracts and TestClient support; WebSocket supports near-live updates required by vote/order flows.
- Alternatives considered: Polling only (higher latency and load); SSE (simpler but less flexible bidirectional lifecycle handling on mobile).

## Decision 3: Authentication model
- Decision: Use Firebase Auth (email/google/facebook) on client, validate Firebase ID tokens in FastAPI middleware.
- Rationale: Centralized identity provider with social login support and backend-verifiable JWTs.
- Alternatives considered: Session cookies (more mobile complexity); custom auth service (unnecessary scope).

## Decision 4: Data storage and authority
- Decision: Use PostgreSQL as authoritative store for events, playlists, votes, delegation, and audit logs.
- Rationale: Strong consistency and transaction support for deterministic conflict handling.
- Alternatives considered: NoSQL stores (weaker relational guarantees for ordered collaborative edits).

## Decision 5: Conflict resolution policy implementation
- Decision: Apply last-write-wins by server timestamp; for exact timestamp ties use lower track_entry_id.
- Rationale: Mirrors clarified product rule and guarantees deterministic outcomes.
- Alternatives considered: CRDT/OT (more complex than required by current rules).

## Decision 6: Music metadata source
- Decision: Integrate YouTube Data API for track lookup and metadata hydration.
- Rationale: Explicit product requirement and broad catalog coverage.
- Alternatives considered: Spotify APIs (not required and introduces additional policy constraints).

## Decision 7: Deployment topology
- Decision: Provision each service in its own Docker container (api, db, optional realtime worker, load-test runner).
- Rationale: Explicit requirement and clear separation for scaling and CI orchestration.
- Alternatives considered: Single container monolith (violates stated requirement).

## Decision 8: CI and quality gates
- Decision: Use GitHub Actions pipelines with gates for lint, tests, contract checks, container build validation, and optional k6 load stage.
- Rationale: Constitution requires CI-first collaborative delivery with deterministic merge checks.
- Alternatives considered: Local-only validation (not acceptable for shared delivery).

## Decision 9: Load testing strategy
- Decision: Use k6 scripts executed in a dedicated container that is started for the test run and stopped afterward.
- Rationale: Matches requirement and keeps load tooling isolated from app runtime image.
- Alternatives considered: Host-installed k6 runner (less reproducible).

## Decision 10: Backend testing approach
- Decision: Use FastAPI TestClient for endpoint and auth/authorization integration tests.
- Rationale: Required by user constraints; supports deterministic API contract verification.
- Alternatives considered: HTTP black-box tests only (slower feedback and less control over fixtures).

## Decision 11: Observability baseline
- Decision: Implement structured action logs for every user-triggered action plus metrics/traces for API capacity by machine size.
- Rationale: Mandatory by constitution and OSR requirements.
- Alternatives considered: Basic unstructured logs only (insufficient for capacity planning and auditability).

## Decision 12: API versioning policy
- Decision: Start endpoints under /api/v1 and require explicit migration/version note for breaking changes.
- Rationale: Required by ACR-003 and constitution contract discipline.
- Alternatives considered: Unversioned endpoints (higher breaking risk).
