"""PostgreSQL contract tests for playlist-scoped playback.

Run these against an already-migrated disposable database, for example:

    PLAYBACK_TEST_DATABASE_URL=postgresql+asyncpg://... uv run --extra dev pytest

Keeping the database opt-in prevents the normal unit-test command from touching a
developer's local database.
"""

import asyncio
import os
import uuid
from collections.abc import AsyncIterator

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Import every relationship target before SQLAlchemy configures the mappers.
from app.models import event_queue, friend, invite  # noqa: F401
from app.models.device import Device, DeviceDelegation
from app.models.playlist import Playlist
from app.models.playlist_track import PlaylistTrack, TrackPlaybackStatus
from app.models.track_info import TrackInfo
from app.models.user import User
from app.models.user_playback_state import PlaybackStatus
from app.services.playback_service import apply_playlist_command, get_state

DATABASE_URL = os.getenv("PLAYBACK_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not DATABASE_URL,
    reason="set PLAYBACK_TEST_DATABASE_URL to run PostgreSQL integration tests",
)


@pytest.fixture
async def sessions() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    assert DATABASE_URL
    engine = create_async_engine(DATABASE_URL)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.connect() as connection:
        if not await connection.scalar(
            text("SELECT to_regclass('public.user_playback_states')")
        ):
            pytest.skip("PLAYBACK_TEST_DATABASE_URL has not been migrated")
    try:
        yield factory
    finally:
        await engine.dispose()


async def _seed(
    sessions: async_sessionmaker[AsyncSession],
    *,
    tracks_per_playlist: tuple[int, int] = (2, 1),
) -> dict[str, object]:
    owner_id, delegate_id, outsider_id = (uuid.uuid4() for _ in range(3))
    owner_device, delegate_device, outsider_device = (uuid.uuid4() for _ in range(3))
    token = uuid.uuid4().hex[:10]
    async with sessions() as db:
        db.add_all(
            [
                User(id=owner_id, firebase_uid=f"owner-{token}"),
                User(id=delegate_id, firebase_uid=f"delegate-{token}"),
                User(id=outsider_id, firebase_uid=f"outsider-{token}"),
                Device(id=owner_device, owner_id=owner_id, name="owner"),
                Device(id=delegate_device, owner_id=delegate_id, name="delegate"),
                Device(id=outsider_device, owner_id=outsider_id, name="outsider"),
            ]
        )
        playlists: list[Playlist] = []
        for number, count in enumerate(tracks_per_playlist, start=1):
            playlist = Playlist(name=f"playlist-{token}-{number}", owner_id=owner_id)
            db.add(playlist)
            await db.flush()
            playlists.append(playlist)
            for position in range(count):
                video_id = f"{token}{number}{position}"[:32]
                db.add(TrackInfo(id=video_id, title=video_id))
                db.add(
                    PlaylistTrack(
                        playlist_id=playlist.id,
                        track_info_id=video_id,
                        user_id=owner_id,
                        position=position,
                        status=TrackPlaybackStatus.queued,
                    )
                )
        await db.commit()
        tracks = []
        for playlist in playlists:
            tracks.append(
                list(
                    (
                        await db.execute(
                            select(PlaylistTrack)
                            .where(PlaylistTrack.playlist_id == playlist.id)
                            .order_by(PlaylistTrack.position)
                        )
                    ).scalars()
                )
            )
    return {
        "owner": owner_id,
        "delegate": delegate_id,
        "outsider": outsider_id,
        "owner_device": owner_device,
        "delegate_device": delegate_device,
        "outsider_device": outsider_device,
        "playlists": playlists,
        "tracks": tracks,
    }


async def _command(
    sessions: async_sessionmaker[AsyncSession], data: dict[str, object], command: str,
    *, playlist_index: int = 0, actor: str = "owner", device: str = "owner_device",
    track_index: int = 0, expected_version: int | None = None,
) -> tuple[object, PlaylistTrack | None]:
    playlists = data["playlists"]
    tracks = data["tracks"]
    assert isinstance(playlists, list) and isinstance(tracks, list)
    async with sessions() as db:
        return await apply_playlist_command(
            db,
            playlist_id=playlists[playlist_index].id,
            actor_id=data[actor],  # type: ignore[arg-type]
            command=command,
            playlist_track_id=tracks[playlist_index][track_index].id,
            device_id=data[device],  # type: ignore[arg-type]
            session_id="owner-session",
            expected_version=expected_version,
        )


async def test_second_device_restores_owner_snapshot(sessions):
    data = await _seed(sessions)
    state, _ = await _command(sessions, data, "play")

    async with sessions() as second_device_db:
        restored = await get_state(second_device_db, data["owner"])

    assert restored is not None
    assert restored.active_playlist_id == data["playlists"][0].id
    assert restored.active_playlist_track_id == data["tracks"][0][0].id
    assert restored.status is PlaybackStatus.PLAYING
    assert restored.version == state.version


async def test_rejects_foreign_device_and_allows_only_delegated_control(sessions):
    data = await _seed(sessions)
    state, _ = await _command(sessions, data, "play")

    with pytest.raises(PermissionError, match="registered"):
        await _command(sessions, data, "pause", device="outsider_device")

    with pytest.raises(PermissionError, match="control permission"):
        await _command(
            sessions, data, "pause", actor="outsider", device="outsider_device",
            expected_version=state.version,
        )

    async with sessions() as db:
        db.add(
            DeviceDelegation(
                device_id=data["owner_device"], delegate_user_id=data["delegate"]
            )
        )
        await db.commit()
    paused, _ = await _command(
        sessions, data, "pause", actor="delegate", device="delegate_device",
        expected_version=state.version,
    )
    assert paused.status is PlaybackStatus.PAUSED
    assert paused.controller_device_id == data["owner_device"]


async def test_switch_pauses_previous_queue_and_terminal_end_keeps_playlist(sessions):
    data = await _seed(sessions, tracks_per_playlist=(1, 1))
    await _command(sessions, data, "play")
    switched, _ = await _command(sessions, data, "play", playlist_index=1)

    async with sessions() as db:
        old_track = await db.get(PlaylistTrack, data["tracks"][0][0].id)
        assert old_track is not None and old_track.status is TrackPlaybackStatus.paused

    terminal, successor = await _command(
        sessions, data, "ended", playlist_index=1, expected_version=switched.version
    )
    assert successor is None
    assert terminal.status is PlaybackStatus.PAUSED
    assert terminal.active_playlist_id == data["playlists"][1].id
    assert terminal.active_playlist_track_id is None


async def test_simultaneous_end_reports_advance_queue_once(sessions):
    data = await _seed(sessions, tracks_per_playlist=(2, 1))
    started, _ = await _command(sessions, data, "play")

    results = await asyncio.gather(
        _command(sessions, data, "ended", expected_version=started.version),
        _command(sessions, data, "ended", expected_version=started.version),
        return_exceptions=True,
    )
    assert sum(not isinstance(result, Exception) for result in results) == 1
    assert any(isinstance(result, ValueError) for result in results)

    async with sessions() as db:
        queue = list(
            (
                await db.execute(
                    select(PlaylistTrack)
                    .where(PlaylistTrack.playlist_id == data["playlists"][0].id)
                    .order_by(PlaylistTrack.position)
                )
            ).scalars()
        )
    assert len(queue) == 1
    assert queue[0].id == data["tracks"][0][1].id
    assert queue[0].position == 0
    assert queue[0].status is TrackPlaybackStatus.playing
