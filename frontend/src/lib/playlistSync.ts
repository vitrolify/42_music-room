import type { PlaylistTrack } from './api/playlistTracks';

type PlaylistPlaybackChangedPayload = {
    playing_track_id: number | null;
    status: 'playing' | 'paused';
};

/** Apply the post-transaction playlist playback snapshot to a local queue. */
export function applyPlaylistPlaybackChanged(
    tracks: PlaylistTrack[],
    payload: PlaylistPlaybackChangedPayload,
): PlaylistTrack[] {
    const nextTracks = tracks
        .filter(track => track.position !== 0)
        .map(track => ({
            ...track,
            position: track.position - 1,
            status: track.id === payload.playing_track_id
                ? payload.status
                : track.status === 'playing' ? 'paused' : track.status,
        }));

    return nextTracks.sort((a, b) => a.position - b.position);
}
