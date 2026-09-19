import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPlaylistPlaybackChanged } from '../src/lib/playlistSync.ts';
import type { PlaylistTrack } from '../src/lib/api/playlistTracks';

function track(id: number, position: number, status: PlaylistTrack['status']): PlaylistTrack {
    return {
        id,
        playlist_id: 7,
        track_info_id: `video-${id}`,
        user_id: null,
        position,
        status,
        track_info: {
            id: `video-${id}`,
            title: `Track ${id}`,
            channel_title: null,
            thumbnail_url: null,
            duration_seconds: null,
        },
    };
}

test('completion removes the finished track and marks the successor playing', () => {
    const next = applyPlaylistPlaybackChanged(
        [track(1, 0, 'playing'), track(2, 1, 'queued'), track(3, 2, 'queued')],
        { playing_track_id: 2, status: 'playing' },
    );

    assert.deepEqual(next.map(item => [item.id, item.position, item.status]), [
        [2, 0, 'playing'],
        [3, 1, 'queued'],
    ]);
});

test('terminal completion removes the finished track and leaves no successor', () => {
    const next = applyPlaylistPlaybackChanged(
        [track(1, 0, 'playing')],
        { playing_track_id: null, status: 'paused' },
    );

    assert.deepEqual(next, []);
});

test('completion pauses any stale playing state on the successor queue', () => {
    const next = applyPlaylistPlaybackChanged(
        [track(1, 0, 'playing'), track(2, 1, 'playing')],
        { playing_track_id: null, status: 'paused' },
    );

    assert.equal(next[0]?.status, 'paused');
});
