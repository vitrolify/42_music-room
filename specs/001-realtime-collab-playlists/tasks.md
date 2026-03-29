# Tasks: Real-Time Collaborative Music Room

**Input**: Design documents from `/specs/001-realtime-collab-playlists/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Include backend contract and integration tests with FastAPI TestClient, plus k6 load-testing automation in containerized execution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize repository structure, toolchain, and baseline automation.

- [ ] T001 Create backend project skeleton and package files in api/pyproject.toml
- [ ] T002 Create FastAPI application entrypoint and router bootstrap in api/app/main.py
- [ ] T003 [P] Create Expo TypeScript app scaffold files in mobile/package.json
- [ ] T004 [P] Create backend Docker image definition in api/Dockerfile
- [ ] T005 [P] Create multi-service docker compose file for api, db, and k6 in infra/docker/compose/docker-compose.yml
- [ ] T006 [P] Create environment template files for api and mobile in .env.example
- [ ] T007 [P] Create GitHub Actions CI workflow with lint/test/contract/container jobs in .github/workflows/ci.yml
- [ ] T008 [P] Create OpenAPI validation script referenced by CI in scripts/validate_openapi.sh

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core infrastructure required by all user stories.

**CRITICAL**: Complete this phase before starting any user story.

- [ ] T009 Implement PostgreSQL connection/session management in api/app/db/session.py
- [ ] T010 Create initial Alembic migration setup for core tables in api/app/db/migrations/env.py
- [ ] T011 [P] Define base SQLAlchemy models and metadata in api/app/models/base.py
- [ ] T012 [P] Implement Firebase token verification dependency in api/app/auth/firebase_auth.py
- [ ] T013 [P] Add authenticated user context dependency and request guards in api/app/auth/dependencies.py
- [ ] T014 Create shared domain enums and constants for visibility/license modes in api/app/models/enums.py
- [ ] T015 Implement structured action logging middleware for all user-triggered requests in api/app/middleware/action_logging.py
- [ ] T016 [P] Implement global exception handlers and error response schema in api/app/api/error_handlers.py
- [ ] T017 [P] Add observability middleware and metrics endpoint in api/app/observability/metrics.py
- [ ] T018 [P] Add secret scanning and hard-fail CI configuration in .github/workflows/secret-scan.yml
- [ ] T019 Configure API router version prefix and register v1 routes in api/app/api/router.py
- [ ] T020 Create reusable invitation and license eligibility service interfaces in api/app/services/access_control_service.py

**Checkpoint**: Foundation complete. User stories can now proceed.

---

## Phase 3: User Story 1 - Vote-Driven Real-Time Queue (Priority: P1) 🎯 MVP

**Goal**: Users can create/join events, suggest tracks, vote/toggle votes, and see deterministic real-time queue ordering with visibility/license enforcement.

**Independent Test**: Create an event, add tracks, cast parallel votes, and verify deterministic ranking and access restrictions without needing US2 or US3.

### Tests for User Story 1

- [ ] T021 [P] [US1] Add contract tests for event creation and queue endpoints in api/tests/contract/test_events_contract.py
- [ ] T022 [P] [US1] Add contract tests for vote toggle endpoint and eligibility errors in api/tests/contract/test_votes_contract.py
- [ ] T023 [P] [US1] Add integration tests for vote toggle semantics with TestClient in api/tests/integration/test_vote_toggle_flow.py
- [ ] T024 [P] [US1] Add integration tests for deterministic tie-break ordering with TestClient in api/tests/integration/test_vote_conflict_resolution.py
- [ ] T025 [P] [US1] Add integration tests for private/invite/location-time vote restrictions in api/tests/integration/test_vote_eligibility_rules.py

### Implementation for User Story 1

- [ ] T026 [P] [US1] Implement Event model and repository mapping in api/app/models/event.py
- [ ] T027 [P] [US1] Implement Playlist and TrackEntry models for event queue in api/app/models/playlist.py
- [ ] T028 [P] [US1] Implement Vote model with unique user-track constraint in api/app/models/vote.py
- [ ] T029 [US1] Create migration for event/playlist/track/vote tables and indexes in api/app/db/migrations/versions/0001_event_queue.py
- [ ] T030 [US1] Implement YouTube metadata provider client for track suggestion hydration in api/app/services/youtube_service.py
- [ ] T031 [US1] Implement queue ranking and deterministic tie-break service in api/app/services/queue_service.py
- [ ] T032 [US1] Implement vote toggle and eligibility evaluation service in api/app/services/vote_service.py
- [ ] T033 [US1] Implement event creation endpoint with blank-or-copied playlist initialization in api/app/api/v1/events.py
- [ ] T034 [US1] Implement queue retrieval and vote endpoints in api/app/api/v1/votes.py
- [ ] T035 [US1] Implement realtime event broadcast channel for queue updates in api/app/realtime/event_ws.py
- [ ] T036 [US1] Add mobile event queue API client and auth headers in mobile/src/services/eventApi.ts
- [ ] T037 [US1] Add mobile vote interaction state and optimistic update handling in mobile/src/state/voteQueueStore.ts
- [ ] T038 [US1] Add backend action logs and metrics for vote and queue paths in api/app/observability/vote_metrics.py

**Checkpoint**: User Story 1 is independently functional and MVP-ready.

---

## Phase 4: User Story 2 - Delegated Playback Control (Priority: P2)

**Goal**: Hosts can grant/revoke device-scoped delegated playback control to invited users.

**Independent Test**: Register devices, grant delegation, execute control attempts with delegate and non-delegate users, then revoke and verify immediate denial.

### Tests for User Story 2

- [ ] T039 [P] [US2] Add contract tests for delegation create/revoke endpoints in api/tests/contract/test_delegations_contract.py
- [ ] T040 [P] [US2] Add integration tests for device-scoped authorization with TestClient in api/tests/integration/test_delegation_scope_flow.py
- [ ] T041 [P] [US2] Add integration tests for revoke-immediate-effect behavior in api/tests/integration/test_delegation_revoke_flow.py

### Implementation for User Story 2

- [ ] T042 [P] [US2] Implement PlaybackDevice model and repository mapping in api/app/models/playback_device.py
- [ ] T043 [P] [US2] Implement DelegationGrant model and repository mapping in api/app/models/delegation_grant.py
- [ ] T044 [US2] Create migration for playback devices and delegation grants in api/app/db/migrations/versions/0002_delegation.py
- [ ] T045 [US2] Implement delegation lifecycle service (grant/validate/revoke) in api/app/services/delegation_service.py
- [ ] T046 [US2] Implement playback authorization policy checks in api/app/services/playback_policy_service.py
- [ ] T047 [US2] Implement delegation API endpoints in api/app/api/v1/delegations.py
- [ ] T048 [US2] Add mobile delegation management API client in mobile/src/services/delegationApi.ts
- [ ] T049 [US2] Add mobile delegation management screen logic in mobile/src/screens/DelegationScreen.tsx
- [ ] T050 [US2] Add action logging and metrics for delegated playback decisions in api/app/observability/delegation_metrics.py

**Checkpoint**: User Stories 1 and 2 are independently functional.

---

## Phase 5: User Story 3 - Real-Time Collaborative Playlist Editor (Priority: P3)

**Goal**: Authenticated users can co-edit playlists in real time with visibility and edit-license controls and deterministic conflict handling.

**Independent Test**: Invite collaborators, perform concurrent add/move/remove operations, and verify synchronized deterministic final order and access restrictions.

### Tests for User Story 3

- [ ] T051 [P] [US3] Add contract tests for playlist edit endpoint in api/tests/contract/test_playlist_edits_contract.py
- [ ] T052 [P] [US3] Add integration tests for invite-only/public playlist access behavior in api/tests/integration/test_playlist_access_flow.py
- [ ] T053 [P] [US3] Add integration tests for concurrent reorder conflict resolution with TestClient in api/tests/integration/test_playlist_conflict_resolution.py

### Implementation for User Story 3

- [ ] T054 [P] [US3] Implement Invitation model and repository mapping for playlist/event access in api/app/models/invitation.py
- [ ] T055 [P] [US3] Implement LicenseRule model and repository mapping in api/app/models/license_rule.py
- [ ] T056 [US3] Create migration for invitation and license rule tables in api/app/db/migrations/versions/0003_access_control.py
- [ ] T057 [US3] Implement collaborative playlist edit service with deterministic conflict handling in api/app/services/playlist_edit_service.py
- [ ] T058 [US3] Implement playlist visibility/edit eligibility enforcement service in api/app/services/playlist_access_service.py
- [ ] T059 [US3] Implement playlist edit API endpoint in api/app/api/v1/playlists.py
- [ ] T060 [US3] Implement realtime playlist update broadcast channel in api/app/realtime/playlist_ws.py
- [ ] T061 [US3] Add mobile collaborative playlist API client in mobile/src/services/playlistApi.ts
- [ ] T062 [US3] Add mobile collaborative playlist editor state management in mobile/src/state/playlistEditorStore.ts
- [ ] T063 [US3] Add action logging and metrics for collaborative edit operations in api/app/observability/playlist_metrics.py

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening across all stories.

- [ ] T064 [P] Add k6 vote load test script with container lifecycle run/stop flow in infra/docker/k6/vote_load.js
- [ ] T065 [P] Add k6 collaborative edit load test script in infra/docker/k6/playlist_edit_load.js
- [ ] T066 Integrate k6 container run stage into GitHub Actions workflow in .github/workflows/ci.yml
- [ ] T067 [P] Add end-to-end quickstart verification script in scripts/verify_quickstart.sh
- [ ] T068 [P] Add API rate limiting and abuse protection middleware in api/app/middleware/rate_limit.py
- [ ] T069 [P] Add OpenAPI changelog/versioning guidance in docs/api-versioning.md
- [ ] T070 [P] Update feature quickstart with final run/test commands in specs/001-realtime-collab-playlists/quickstart.md
- [ ] T071 Validate observability dashboards and capacity metrics configuration in infra/observability/dashboard.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies, starts immediately.
- Foundational (Phase 2): Depends on Setup completion and blocks all story implementation.
- User Stories (Phases 3-5): Depend on Foundational completion.
- Polish (Phase 6): Depends on completion of selected user stories.

### User Story Dependencies

- US1 (P1): Depends only on Foundational phase. No dependency on US2 or US3.
- US2 (P2): Depends on Foundational phase and can run independently of US1 logic.
- US3 (P3): Depends on Foundational phase and can run independently of US2 logic.

### Story Completion Order

- Preferred MVP order: US1 -> US2 -> US3.
- Parallel option after Phase 2: US1, US2, and US3 can be developed concurrently by separate contributors.

### Within Each User Story

- Tests first (contract and integration), confirm failures before implementation.
- Models and migrations before service logic.
- Services before API/realtime endpoints.
- Observability and logging instrumentation before story sign-off.

---

## Parallel Execution Examples

### User Story 1

- Run T021, T022, T023, T024, and T025 in parallel (different test files).
- Run T026, T027, and T028 in parallel (different model files).

### User Story 2

- Run T039, T040, and T041 in parallel (different test files).
- Run T042 and T043 in parallel (different model files).

### User Story 3

- Run T051, T052, and T053 in parallel (different test files).
- Run T054 and T055 in parallel (different model files).

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1).
4. Validate US1 independently with TestClient suites and realtime queue behavior.
5. Demo/deploy MVP.

### Incremental Delivery

1. Deliver US1 as the first production slice.
2. Add US2 and validate delegated playback flows independently.
3. Add US3 and validate collaborative editing independently.
4. Finish with Phase 6 hardening, load tests, and CI quality gates.

### Parallel Team Strategy

1. Team aligns on Setup and Foundational tasks.
2. After checkpoint, assign contributors per story stream (US1/US2/US3).
3. Merge by story checkpoints to preserve independent testability.

---

## Notes

- All tasks follow strict checklist format: checkbox + ID + optional [P] + required [USx] in story phases + file path.
- Keep secret values out of git and use environment/CI secret stores only.
- Ensure unauthenticated requests are rejected for discovery, voting, editing, and delegation endpoints.
