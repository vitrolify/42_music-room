import { request } from './client';

export type TrackPlaybackStatus = 'played' | 'queued' | 'playing';

export type PlaylistTrack = {
    id: number;
    playlist_id: number;
    track_info_id: string | null;
    user_id: string | null;
    status: TrackPlaybackStatus;
    position: number;
};

export type PlaylistEventType = 'play' | 'pause' | 'add' | 'skip' | 'move';

export type PlaylistEventPayload = Record<string, unknown>;

export type PlaylistEvent = {
    id: number;
    playlist_id: number;
    user_id: string;
    event: PlaylistEventType;
    track_info_id: string | null;
    payload: PlaylistEventPayload;
    created_at: string;
};

export type PlaylistEventCreate = {
    event: PlaylistEventType;
    track_info_id?: string | null;
    payload?: PlaylistEventPayload;
};

export async function listPlaylistTracks(playlistId: number): Promise<PlaylistTrack[]> {
    return request<PlaylistTrack[]>('GET', `/playlists/${playlistId}/tracks`);
}

export async function createPlaylistEvent(
    playlistId: number,
    data: PlaylistEventCreate,
): Promise<PlaylistEvent> {
    return request<PlaylistEvent>('POST', `/playlists/${playlistId}/events`, data);
}

export async function addPlaylistTrack(
    playlistId: number,
    trackInfoId: string,
): Promise<PlaylistEvent> {
    return createPlaylistEvent(playlistId, {
        event: 'add',
        track_info_id: trackInfoId,
        payload: {},
    });
}

export async function movePlaylistTrack(
    playlistId: number,
    track: PlaylistTrack,
    newPosition: number,
): Promise<PlaylistEvent> {
    return createPlaylistEvent(playlistId, {
        event: 'move',
        payload: {
            playlist_track_id: track.id,
            current_position: track.position,
            new_position: newPosition,
        },
    });
}
