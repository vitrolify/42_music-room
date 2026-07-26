import { request } from './client';

export type TrackPlaybackStatus = 'queued' | 'playing' | 'paused';

export type PlaylistTrack = {
    id: number;
    playlist_id: number;
    track_info_id: string;
    user_id: string | null;
    status: TrackPlaybackStatus;
    position: number;
    track_info: {
        id: string;
        title: string;
        channel_title: string | null;
        thumbnail_url: string | null;
        duration_seconds: number | null;
    };
};

export type PlaylistEventType = 'play' | 'pause' | 'add' | 'skip' | 'move' | 'delete';

export type PlaylistEventPayload = Record<string, unknown>;

export type PlaylistEvent = {
    id: number;
    playlist_id: number;
    user_id: string;
    event: PlaylistEventType;
    payload: PlaylistEventPayload;
    created_at: string;
};

export type PlaylistEventCreate =
    | { event: 'add'; track_info_id: string }
    | { event: 'move'; playlist_track_id: number; current_position: number; new_position: number }
    | { event: 'play' | 'pause' | 'skip' | 'delete'; playlist_track_id: number };

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
    });
}

export async function movePlaylistTrack(
    playlistId: number,
    track: PlaylistTrack,
    newPosition: number,
): Promise<PlaylistEvent> {
    return createPlaylistEvent(playlistId, {
        event: 'move',
        playlist_track_id: track.id,
        current_position: track.position,
        new_position: newPosition,
    });
}

async function playbackEvent(
    playlistId: number,
    event: 'play' | 'pause' | 'skip' | 'delete',
    track: PlaylistTrack,
): Promise<PlaylistEvent> {
    return createPlaylistEvent(playlistId, { event, playlist_track_id: track.id });
}

export const playPlaylistTrack = (playlistId: number, track: PlaylistTrack) =>
    playbackEvent(playlistId, 'play', track);
export const pausePlaylistTrack = (playlistId: number, track: PlaylistTrack) =>
    playbackEvent(playlistId, 'pause', track);
export const skipPlaylistTrack = (playlistId: number, track: PlaylistTrack) =>
    playbackEvent(playlistId, 'skip', track);
export const deletePlaylistTrack = (playlistId: number, track: PlaylistTrack) =>
    playbackEvent(playlistId, 'delete', track);
