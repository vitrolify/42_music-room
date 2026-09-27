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
    if (tracks.length === 0) {
        return [];
    }

    const { playing_track_id, status } = payload;

    // Case 1: A specific track is now playing or paused
    if (playing_track_id !== null) {
        const targetIndex = tracks.findIndex(t => t.id === playing_track_id);

        if (targetIndex === 0) {
            // The active track is at position 0. No tracks have been skipped or completed.
            // Only update track statuses.
            return tracks.map(track => {
                if (track.id === playing_track_id) {
                    return { ...track, status };
                }
                return track.status === 'playing' ? { ...track, status: 'paused' } : track;
            });
        }

        if (targetIndex > 0) {
            // Playback has advanced to a successor track in the queue (e.g. track 0 completed or skipped).
            // Remove tracks prior to the target track, and adjust positions.
            return tracks.slice(targetIndex).map((track, idx) => ({
                ...track,
                position: idx,
                status: idx === 0
                    ? status
                    : track.status === 'playing' ? 'paused' : track.status,
            }));
        }

        // targetIndex === -1: The playing track is not found in the local list.
        // Keep current tracks without removing them, pausing any currently playing track.
        return tracks.map(track =>
            track.status === 'playing' ? { ...track, status: 'paused' } : track
        );
    }

    // Case 2: playing_track_id is null (terminal completion / end of playlist reached)
    // If track 0 was playing, it has completed with no successor.
    if (tracks[0]?.status === 'playing') {
        const remaining = tracks.slice(1);
        return remaining.map((track, idx) => ({
            ...track,
            position: idx,
            status: 'paused',
        }));
    }

    // If track 0 was not playing, ensure all tracks are paused.
    return tracks.map(track =>
        track.status === 'playing' ? { ...track, status: 'paused' } : track
    );
}
