# Feature Specification: Real-Time Collaborative Music Room

**Feature Branch**: `001-realtime-collab-playlists`  
**Created**: 2026-03-29  
**Status**: Draft  
**Input**: User description: "Real-time voting playlist, delegated music control, and real-time collaborative playlist editor with visibility and license rules"

## Clarifications

### Session 2026-03-29

- Q: Qual regra de desempate/resolucao de concorrencia deve ser aplicada para votos e reordenacoes simultaneas? -> A: Last-write-wins por timestamp do servidor; em empate exato, menor track_entry_id vence.
- Q: Como um evento deve iniciar sua playlist (em branco ou copia de playlist existente)? -> A: Evento inicia com playlist propria em branco por padrao, com opcao de criar a partir de copia de playlist existente.
- Q: Qual deve ser a politica de voto por usuario em cada faixa? -> A: Um usuario pode ter no maximo 1 voto ativo por faixa, com operacao de adicionar/remover (toggle).
- Q: Como validar licenca por localizacao e janela de horario? -> A: Backend valida elegibilidade de localizacao e horario usando horario do servidor.
- Q: Descoberta de conteudo publico deve exigir autenticacao? -> A: Sim, inclusive descoberta publica exige autenticacao.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Vote-Driven Real-Time Queue (Priority: P1)

As an event participant, I can suggest tracks and vote on upcoming tracks so the
playlist order reflects group preference in real time.

**Why this priority**: This is the core product value for parties and events. Without
real-time voting and queue reprioritization, the service does not deliver its primary use case.

**Independent Test**: Create an event, have multiple participants submit and vote on
tracks, then verify the queue order updates deterministically and playback order changes accordingly.

**Acceptance Scenarios**:

1. **Given** a user is creating a new event,
   **When** no playlist template is selected,
   **Then** the event starts with its own blank playlist by default.
2. **Given** a user is creating a new event,
   **When** an existing playlist is selected as source,
   **Then** the event starts with a copied playlist scoped to that event.
1. **Given** a public event with an active queue, **When** any authenticated user suggests a track,
   **Then** the track is added to the queue and visible to all eligible voters.
2. **Given** multiple tracks in queue, **When** users vote in parallel,
  **Then** the queue reprioritizes in real time using deterministic rules: last-write-wins by server timestamp, and exact timestamp ties are resolved by lower track entry identifier.
3. **Given** a participant has already voted for a track,
   **When** the participant votes for the same track again,
   **Then** the vote is toggled off and the ranking is recalculated.
3. **Given** a private event, **When** a non-invited user searches and attempts to vote,
   **Then** the event is not discoverable and voting is denied.
4. **Given** vote access is restricted by license to invited users,
   **When** a non-invited participant attempts to vote,
   **Then** the vote is rejected with an access reason.
5. **Given** vote access is restricted by location and time window,
   **When** an out-of-window participant attempts to vote,
   **Then** the vote is rejected and the eligibility window is shown.

---

### User Story 2 - Delegated Playback Control (Priority: P2)

As an account owner, I can delegate music playback control to selected friends using
device-specific permissions.

**Why this priority**: Delegation extends host flexibility in social settings and reduces
single-user bottlenecks during events.

**Independent Test**: Register two user devices, grant control rights for one device to
an invited friend, and verify that only authorized delegates can execute playback controls.

**Acceptance Scenarios**:

1. **Given** a host account with multiple registered devices,
   **When** the host grants delegation for one device to a friend,
   **Then** the friend can control playback only on that delegated device.
2. **Given** a user without delegation rights,
   **When** they attempt to pause, skip, or reorder playback,
   **Then** the action is denied and does not change playback state.
3. **Given** delegation is revoked,
   **When** the previous delegate attempts control,
   **Then** control is blocked immediately.

---

### User Story 3 - Real-Time Collaborative Playlist Editor (Priority: P3)

As a user, I can co-edit playlists in real time with friends or like-minded users to build
shared radio-style playlists.

**Why this priority**: Collaborative editing deepens engagement and expands the product
from event voting into social playlist creation.

**Independent Test**: Create a playlist, invite collaborators, perform concurrent edits
(add/move/remove tracks), and verify conflict-safe ordering and synchronized final state.

**Acceptance Scenarios**:

1. **Given** a public playlist, **When** any authenticated user opens it,
   **Then** the user can view and edit according to the active license mode.
2. **Given** a private playlist, **When** a non-invited user attempts access,
   **Then** access is denied and playlist content is not exposed.
3. **Given** edit access is license-restricted to invited users,
   **When** a non-invited user attempts to move a track,
   **Then** the change is rejected.
4. **Given** two invited users move the same track at nearly the same time,
   **When** both updates are processed,
  **Then** the system applies deterministic conflict resolution (last-write-wins by server timestamp, then lower track entry identifier) and preserves a consistent final order.

---

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- Two users cast opposite votes on different tracks at the exact same moment.
- Multiple users vote repeatedly for the same track in a short window, including rapid toggle operations.
- The same track is suggested by different users with slight metadata differences.
- A private event is switched to public (or public to private) while users are active.
- License mode changes while users are currently voting or editing.
- Location/time-based voting eligibility changes mid-session.
- Device clock differs from server time during location-time license voting.
- Unauthenticated user attempts to discover public events or playlists.
- A delegate loses rights while issuing playback commands.
- Two editors move overlapping track ranges simultaneously.
- Network reconnection delivers delayed actions after newer state already exists.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST allow users to create and join music events with a real-time playlist queue.
- **FR-001A**: System MUST initialize each new event with an event-owned blank playlist by default.
- **FR-001B**: System MUST allow optional event initialization from a copy of an existing playlist.
- **FR-002**: System MUST allow participants to suggest tracks to an active event queue.
- **FR-003**: System MUST allow eligible participants to vote for tracks and update ranking in real time.
- **FR-003A**: System MUST allow at most one active vote per user per track.
- **FR-003B**: System MUST treat a repeated vote by the same user on the same track as a toggle remove operation.
- **FR-004**: System MUST enforce deterministic tie-breaking for equal-vote tracks using last-write-wins by server timestamp and lower track entry identifier on exact timestamp ties.
- **FR-005**: System MUST support event visibility modes with default `Public` and optional `Private`.
- **FR-006**: System MUST make public events discoverable to authenticated users.
- **FR-007**: System MUST restrict private event discovery and voting to invited users only.
- **FR-008**: System MUST support voting license modes with default open voting.
- **FR-009**: System MUST support a voting license mode limited to invited users only.
- **FR-010**: System MUST support a voting license mode limited by location and time window.
- **FR-011**: System MUST evaluate voting eligibility at action time and reject non-eligible votes.
- **FR-011A**: System MUST perform location-time voting license validation on backend using server time as authoritative reference.
- **FR-012**: System MUST allow account owners to delegate playback control rights.
- **FR-013**: System MUST scope delegation rights to specific user devices.
- **FR-014**: System MUST allow owners to revoke delegated control at any time.
- **FR-015**: System MUST provide a real-time collaborative playlist editor.
- **FR-016**: System MUST support playlist visibility modes with default `Public` and optional `Private`.
- **FR-017**: System MUST restrict private playlist access to invited users only.
- **FR-017A**: System MUST allow public playlist discovery only for authenticated users.
- **FR-018**: System MUST support playlist editing license modes with default open editing and optional invite-only editing.
- **FR-019**: System MUST resolve concurrent playlist edit conflicts deterministically using last-write-wins by server timestamp and lower track entry identifier on exact timestamp ties.
- **FR-020**: System MUST persist all authoritative event, playlist, voting, delegation, and license states in backend services.

### API Contract Requirements *(mandatory for backend-integrated features)*

- **ACR-001**: Integration between clients and backend MUST use REST endpoints.
- **ACR-002**: API request and response payloads MUST use JSON.
- **ACR-003**: Any breaking API contract change MUST define versioning or migration
  strategy before implementation.

### Operational and Security Requirements *(mandatory)*

- **OSR-001**: System MUST emit backend logs for every user-triggered client action.
- **OSR-002**: System MUST define observability signals needed to measure API
  capacity by host machine size (metrics/logs/traces or equivalent).
- **OSR-003**: System MUST keep authoritative persistent data in the backend.
- **OSR-004**: Secrets MUST NOT be committed to the git repository.
- **OSR-005**: Feature delivery MUST define CI validation gates required for merge.
- **OSR-006**: Discovery, voting, editing, and delegation endpoints MUST reject unauthenticated requests.

### Key Entities *(include if feature involves data)*

- **Event**: Live collaborative music session with visibility mode, voting license mode,
  participant set, active queue, and playlist initialization mode (blank or copied template).
- **Playlist**: Ordered set of tracks linked to an event or collaborative context,
  with visibility mode and editing license mode.
- **Track Entry**: A track in queue/playlist with position, score, proposer,
  and conflict resolution metadata.
- **Vote**: User vote action associated with an event and track entry, including
  eligibility decision context (invite/location/time) and per-user-per-track uniqueness.
- **License Rule**: Policy object defining who can vote/edit/control under specific
  conditions (open, invite-only, location-time constrained).
- **Invitation**: Access grant connecting an event or playlist to an eligible user.
- **Delegation Grant**: Time-valid permission from account owner to delegate playback
  control for a specific device.
- **Playback Device**: User-owned endpoint authorized to execute playback controls.
- **Action Log Record**: Backend record of user-triggered actions and outcomes.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: In moderated acceptance testing, 95% of valid votes are reflected in visible queue ordering within 2 seconds.
- **SC-002**: Under concurrent voting simulation, 100% of processed vote conflicts end with a deterministic queue order and no duplicate rank positions.
- **SC-003**: At least 90% of invited users complete delegated-control setup and execute a successful control action on first attempt.
- **SC-004**: In collaborative editing sessions with at least 20 simultaneous editors,
  99% of accepted edits produce a consistent final playlist order for all participants.
- **SC-005**: Access-control tests show 100% enforcement for private visibility and invite/license restrictions across voting and editing flows.

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- Users are authenticated before performing event, voting, delegation, or editing actions.
- Invite lifecycle (create/revoke/accept) is available as a reusable capability for events and playlists.
- Location-time eligibility uses trusted location signals and authoritative server time at vote submission time.
- Playback control actions apply to connected and registered user devices.
- Temporary client-side buffering may exist for UX continuity, but backend remains source of truth.
- Existing backend observability and action logging foundations are available for extension.
