# Data Model - Realtime Collab Playlists

## Event
- id: UUID (PK)
- owner_user_id: UUID (FK -> User)
- name: string (1..120)
- visibility: enum(public, private) default public
- voting_license_mode: enum(open, invite_only, location_time)
- location_scope: jsonb nullable (geofence/region config)
- vote_window_start_at: timestamptz nullable
- vote_window_end_at: timestamptz nullable
- playlist_init_mode: enum(blank, copied)
- source_playlist_id: UUID nullable
- created_at: timestamptz
- updated_at: timestamptz

Validation rules:
- vote_window_start_at < vote_window_end_at when both are set.
- source_playlist_id required when playlist_init_mode=copied.

## Playlist
- id: UUID (PK)
- event_id: UUID nullable (FK -> Event)
- owner_user_id: UUID (FK -> User)
- title: string (1..120)
- visibility: enum(public, private) default public
- edit_license_mode: enum(open, invite_only)
- created_at: timestamptz
- updated_at: timestamptz

Validation rules:
- event-scoped playlist must belong to same event context for edits.

## TrackEntry
- id: bigint (PK, monotonic)
- playlist_id: UUID (FK -> Playlist)
- youtube_video_id: string
- title: string
- duration_seconds: int nullable
- thumbnail_url: string nullable
- proposer_user_id: UUID (FK -> User)
- position: int
- score: int default 0
- last_action_at: timestamptz (server-authoritative)
- created_at: timestamptz
- updated_at: timestamptz

Validation rules:
- unique(playlist_id, position)
- youtube_video_id not empty

State transitions:
- Added -> Reordered -> Removed

## Vote
- id: UUID (PK)
- event_id: UUID (FK -> Event)
- track_entry_id: bigint (FK -> TrackEntry)
- user_id: UUID (FK -> User)
- is_active: boolean
- eligibility_mode: enum(open, invite_only, location_time)
- eligibility_reason: string nullable
- created_at: timestamptz
- updated_at: timestamptz

Validation rules:
- unique(event_id, track_entry_id, user_id)
- toggle semantics: repeated vote by same user flips is_active.

State transitions:
- Active <-> Inactive (toggle)

## LicenseRule
- id: UUID (PK)
- resource_type: enum(event_vote, playlist_edit, playback_control)
- resource_id: UUID
- mode: enum(open, invite_only, location_time)
- config: jsonb nullable
- created_at: timestamptz
- updated_at: timestamptz

## Invitation
- id: UUID (PK)
- resource_type: enum(event, playlist)
- resource_id: UUID
- invited_user_id: UUID (FK -> User)
- invited_by_user_id: UUID (FK -> User)
- status: enum(pending, accepted, revoked)
- created_at: timestamptz
- updated_at: timestamptz

## PlaybackDevice
- id: UUID (PK)
- owner_user_id: UUID (FK -> User)
- provider_device_ref: string
- display_name: string
- status: enum(online, offline)
- created_at: timestamptz
- updated_at: timestamptz

## DelegationGrant
- id: UUID (PK)
- owner_user_id: UUID (FK -> User)
- delegate_user_id: UUID (FK -> User)
- playback_device_id: UUID (FK -> PlaybackDevice)
- starts_at: timestamptz
- ends_at: timestamptz nullable
- revoked_at: timestamptz nullable
- created_at: timestamptz

Validation rules:
- active only when revoked_at is null and current_time within [starts_at, ends_at].

State transitions:
- Granted -> Active -> Revoked or Expired

## ActionLogRecord
- id: UUID (PK)
- request_id: string
- user_id: UUID nullable
- action_type: string
- resource_type: string
- resource_id: string
- outcome: enum(success, denied, error)
- reason: string nullable
- metadata: jsonb
- created_at: timestamptz

## User (local projection from Firebase)
- id: UUID (PK)
- firebase_uid: string unique
- email: string nullable
- display_name: string nullable
- created_at: timestamptz
- updated_at: timestamptz

## Relationships
- Event 1..* Playlist (event-owned playlist context)
- Playlist 1..* TrackEntry
- TrackEntry 1..* Vote
- Event 1..* Vote
- Event/Playlist 1..* Invitation
- User 1..* PlaybackDevice
- PlaybackDevice 1..* DelegationGrant
- User 1..* DelegationGrant (owner and delegate)
