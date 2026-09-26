import type { PlaylistTrack } from './api/playlistTracks';

type PlaylistPlaybackChangedPayload = {
    playing_track_id: number | null;
    status: 'playing' | 'paused';
    queue_advanced?: boolean;
};

/** Apply a playlist playback update without changing the queue unless it advanced. */
export function applyPlaylistPlaybackChanged(
    tracks: PlaylistTrack[],
    payload: PlaylistPlaybackChangedPayload,
): PlaylistTrack[] {
    if (!payload.queue_advanced) {
        return tracks.map(track => ({
            ...track,
            status: track.id === payload.playing_track_id
                ? payload.status
                : track.status === 'playing' ? 'paused' : track.status,
        }));
    }

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
