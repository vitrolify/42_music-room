# Playlist-Scoped Synced Player

## Objective

Integrate the PR 75 synchronized YouTube player with playlist playback and PR 74 device delegation.

A user has one active playlist across their own devices. Playback state is synchronized across those devices; the active playlist supplies the queue and position-zero track. The embedded player is visible only on the active playlist, remains mounted while navigating elsewhere, and the mini player navigates back to that playlist.

## Product rules

- A user has at most one active playlist at a time.
- The queue is authoritative for ordering and for the current track (`position == 0`).
- The synchronized playback row is authoritative for playback status, media position, active playlist, active track, controller device, and controller session.
- Starting position-zero playback on a different playlist pauses the prior active playlist and makes the new playlist active.
- Delegated users may control an owner’s active playlist only when authorized for the owner’s controller device; they do not become the playback-progress controller.
- Only the controller device/session may checkpoint progress or report the end of a track.
- An end event advances once, atomically. It plays the next queued track when available; at queue end, playback pauses while the active playlist and mini player remain available.
- Standalone URL/video loading is deprecated. Playback begins from a playlist’s position-zero track.

## Acceptance scenarios

- [ ] Logging in on a second device restores the same active playlist, track, status, and elapsed playback position.
- [ ] Tapping Play in a different playlist pauses the previously active playlist’s position-zero track and starts the new one on every synced owner device.
- [ ] The mini player is visible while a playlist has active or terminal-paused playback, and its press navigates to that active playlist.
- [ ] Only the active playlist displays the YouTube embed, play/pause control, elapsed/total time, and seekable progress bar.
- [ ] Leaving the active playlist does not unmount or interrupt the underlying player.
- [ ] A valid delegate can play, pause, seek, and skip; a non-delegate cannot; no delegate can delete a track through playback delegation.
- [ ] Simultaneous end notifications from synced devices advance the queue only once.
- [ ] When the final track ends, the player pauses without looping or clearing the active playlist.

## Tasks

### 1. Reconcile database history and state model

- [x] Add an Alembic merge revision whose parents are `943455df7c96` (devices) and `5a2f6a2c9d10` (playback), with no schema operations.
  - Verify: `alembic heads` reports exactly one head after migration files are present.
- [x] Add a migration extending `user_playback_states` with nullable active playlist, active playlist track, and controller-device identifiers; use foreign-key behavior that preserves terminal playback when a track is removed.
  - Verify: upgrade from an empty database succeeds and the columns are present.
- [x] Extend the playback ORM model and read schema with these fields.
  - Verify: an empty playback state serializes without validation errors.

### 2. Establish durable device identity

- [ ] Add a platform-aware device-identity utility: persist one generated UUID per native install and per browser profile.
  - Verify: restarting the app/browser returns the same UUID; a separate profile/device gets a different UUID.
- [x] Register the identity after authentication and expose it to API/WebSocket callers.
  - Verify: the device appears in `GET /devices` for the authenticated user.
- [x] Send `device_id` when connecting to playlist and playback WebSockets.
  - Verify: the backend receives a non-empty UUID from the normal playlist screen flow.
- [x] Reject unregistered devices and devices not owned by the playback user when connecting or issuing a playback command.
  - Verify: forged, malformed, and foreign device IDs are denied without storing invalid active-device state.

### 3. Make playlist playback transactional and authorized

- [ ] Refactor playlist play, pause, skip, and new `ended` processing to update queue state and the owner’s playback state in one locked database transaction.
  - Verify: each successful action emits a playlist update and a synchronized playback snapshot with matching playlist/track/status data.
- [ ] Add playlist-scoped seek and checkpoint commands carrying track ID, expected version, position, duration, device ID, and session ID.
  - Verify: a valid controller updates position and increments version; stale versions are rejected.
- [ ] Implement activation: playing a new playlist pauses the previous active position-zero track, sets the new active playlist/track, loads its YouTube ID, and sets the requesting owner device as controller.
  - Verify: no owner can have two tracks marked playing after an activation.
- [ ] Enforce delegated control against the durable controller device. Delegated commands may change play/pause/seek/skip state but do not replace controller device/session.
  - Verify: authorized delegates succeed; unauthorized users receive `403`; delegated `delete` remains denied or follows normal playlist-edit permission only.
- [ ] Implement controller-only `ended` handling. Lock state, verify active playlist/track/version/controller identity, and advance the queue once.
  - Verify: repeated or concurrent `ended` requests leave exactly one successor at position zero.
- [ ] Preserve terminal playback at end of queue: keep active playlist and terminal media metadata, clear the removed active-track reference when needed, and set status to paused.
  - Verify: no successor starts, the mini player remains visible, and the user can navigate to the completed playlist.

### 4. Unify realtime contracts

- [ ] Extend playback-state REST and WebSocket payloads with active playlist, active track, and controller-device fields.
  - Verify: a newly connected owner device hydrates the complete current state before receiving later broadcasts.
- [ ] Keep playlist WebSockets for queue mutations and playback WebSockets for owner-device playback snapshots; ensure both broadcasts are emitted after a successful transaction.
  - Verify: playlist viewers refresh queue changes, while all owner devices apply the same media state and position.
- [x] Remove Redis TTL as authority for delegated playback authorization; retain Redis only for realtime delivery/presence if needed.
  - Verify: a controller still has authority after more than one hour of continuous playback.

### 5. Refactor the player UI around the active playlist

- [ ] Replace the standalone PlayerOverlay/manual YouTube URL entry flow with a single globally mounted player host.
  - Verify: navigation away from the active playlist does not destroy the YouTube instance or stop playback.
- [ ] Render the player embed, title, play/pause action, elapsed/total time, and seekable progress bar on the active playlist only.
  - Verify: opening a non-active playlist shows its queue without a playable embedded surface.
- [ ] Adapt `PlayerContext` and playback synchronization so playlist actions, rather than generic video loading, drive play/pause/skip; playlist-scoped seek/checkpoint drives progress updates.
  - Verify: user controls on any synced device update all of that user’s devices and do not diverge from queue state.
- [x] Change the mini player press action to navigate to the active playlist route; preserve direct play/pause and progress behavior.
  - Verify: pressing the title/bar always opens the active playlist, including after app-state hydration.
- [x] Remove deprecated standalone video-ID input UI.
  - Verify: no visible route or UI can load arbitrary video playback outside a playlist.

### 6. Automated verification

- [ ] Add migration coverage proving a single Alembic head and successful upgrade.
- [ ] Add backend integration tests for owner playback, state restoration, delegated controls, invalid devices, duplicate end events, playlist switching, and terminal queue completion.
- [ ] Add frontend/component tests for active-playlist navigation, persistent mounting, control visibility, and state hydration.
- [ ] Run backend lint/type/test checks and frontend type checks.
  - Partial verification: frontend type checking, backend Ruff, and Alembic-head verification pass; backend type and integration tests have not been run.

## Execution status (2026-09-07)

Only the checked items above are implemented. The work was completed directly in the shared
worktree, not by the plan's proposed subagents. Tasks 3–6 remain incomplete, including the
controller-only `ended` flow, playlist-scoped seek/checkpoint contract, persistent active-playlist
embed surface, and the planned backend/frontend integration tests.

## Implementation constraints

- Preserve PR 75’s user-wide synchronization behavior across the owner’s devices.
- Preserve PR 74’s playlist permissions and device delegation behavior, while fixing its missing frontend `device_id`, invalid-device validation, delegated-delete, and TTL-authority defects.
- Do not introduce a second independently authoritative playback state or a synchronization bridge between competing states.

## Subagent execution plan

### Shared rules for every agent

- Work in an isolated worktree/branch for the assigned checkpoint. Do not modify another lane’s files unless the checkpoint explicitly owns them.
- Before committing, run the focused checks listed in that checkpoint and inspect `git diff`/`git status` for unrelated changes.
- Commit every completed checkpoint as one atomic batch. Do not combine checkpoints or leave finished work uncommitted.
- Preserve the repository’s configured Git identity (`Lucas Fads <lucasfads@gmail.com>`). Do **not** set `--author`, do not change `user.name`/`user.email`, and never attribute commits to Codex, GPT, Terra, or Luna.
- Follow the repository’s Conventional Commit pattern, for example `feat(playback): ...`, `feat(frontend): ...`, `fix(api): ...`, or `test(playback): ...`.
- Do not force-push, amend another agent’s commit, reset, or modify the plan unless the assigned checkpoint requires it.

### Dependency map

```text
T1 Terra: migration + playback-state model ─┐
                                             ├─ T3 Terra: transactional playlist playback ─┬─ T5 Terra: backend integration tests
T2 Luna: device identity + WS parameters ───┘                                               └─ T4 Luna: persistent playlist player UI ── T6 Luna: frontend verification
```

T1 and T2 can run in parallel. T3 starts only after T1; it can use T2’s committed device-ID contract once available. T4 starts after T2 and T3 have landed because it consumes the finalized playback snapshot and command API. T5 and T4 may run in parallel after T3. T6 is final and depends on T4 plus the merged backend contract.

### T1 — Terra: database history and playlist-aware playback state

**Scope:** Tasks 1.1–1.3 from this plan: Alembic merge revision, playback-state columns, ORM/schema updates, and migration coverage.

- [ ] Create the no-op Alembic merge revision for the device and playback heads.
- [ ] Add the playlist, track, and controller-device state fields with safe nullable/foreign-key behavior.
- [ ] Update the model and playback read schema without changing command behavior yet.
- [ ] Add focused migration/schema tests.

**Verify:** `alembic heads` has one head; upgrading an empty test database succeeds; playback serialization includes the new nullable fields.

**Checkpoint commit:** `feat(playback): add playlist playback state`

### T2 — Luna: durable frontend device identity

**Scope:** Tasks 2.1–2.3 only: generated persisted device identity, device registration client integration, and `device_id` in both WebSocket URL builders.

- [ ] Add platform-specific persistent UUID storage for web and native.
- [ ] Register/reuse the device after authentication and make the identity available to the WebSocket callers.
- [ ] Update playlist and playback WebSocket URLs to include the device ID.
- [ ] Add focused unit/component checks for identity persistence and URL construction.

**Verify:** reload returns the same device ID; a distinct profile gets a distinct ID; both socket URLs contain an encoded `device_id`.

**Checkpoint commit:** `feat(frontend): persist playback device identity`

### T3 — Terra: authoritative playlist playback service

**Scope:** Tasks 3 and 4.1–4.3: command authorization, activation, transactional queue/playback transitions, realtime payloads, and controller-only completion.

- [ ] Validate controller device ownership and use durable playback state—not Redis TTL—as delegation authority.
- [ ] Extend playlist events with `ended`; add playlist-scoped seek/checkpoint API handling.
- [ ] Implement locked atomic transitions for play, pause, seek, checkpoint, skip, switch-playlist, and end-of-track.
- [ ] Publish matching queue and owner playback snapshots after commit.
- [ ] Preserve terminal paused playback after the final queue item.

**Verify:** focused API/integration tests demonstrate delegation boundaries, one active playlist per owner, duplicate-end protection, and correct next-track/terminal behavior.

**Checkpoint commit:** `feat(playback): synchronize playlist playback state`

### T4 — Luna: persistent active-playlist player experience

**Scope:** Tasks 5.1–5.5: player-host refactor, playlist controls, mini-player routing, and removal of standalone video loading.

- [ ] Keep one YouTube instance mounted at the tab/app-shell level while routes change.
- [ ] Render its visible embed/control surface only for the active playlist.
- [ ] Bind player controls to the finalized playlist command API and playback snapshot fields.
- [ ] Make mini-player presses navigate to the active playlist; remove the manual URL/video-ID UI.

**Verify:** navigation does not recreate the player; inactive playlists have no player panel; mini-player navigation reaches the restored active playlist.

**Checkpoint commit:** `refactor(player): connect player to active playlist`

### T5 — Terra: backend contract and concurrency verification

**Scope:** Backend portion of task 6, after T3 is merged.

- [ ] Add end-to-end tests for restore-on-second-device, device validation, owner/delegate authorization, playlist switching, and terminal completion.
- [ ] Add a concurrent/stale end-report test proving the queue advances exactly once.
- [ ] Run backend lint, type, migration, and test commands.

**Verify:** all backend checks pass and each acceptance scenario has automated coverage.

**Checkpoint commit:** `test(playback): cover playlist synchronization flows`

### T6 — Luna: frontend verification and final integration

**Scope:** Frontend portion of task 6, after T4 and the T3 API contract are merged.

- [ ] Add component/integration coverage for state hydration, active-playlist navigation, persistent mounting, control visibility, and terminal mini-player behavior.
- [ ] Run frontend type checking and available test commands.
- [ ] Resolve only frontend integration defects found by these checks.

**Verify:** frontend checks pass; active-playlist rendering and mini-player routing satisfy every UI acceptance scenario.

**Checkpoint commit:** `test(frontend): verify playlist player flow`
