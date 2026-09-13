export type SyncStatus = 'connecting' | 'synced' | 'offline' | 'autoplay-blocked' | 'revoked' | 'unauthorized';

export type PlaybackSnapshot = {
    video_id: string;
    status: 'playing' | 'paused';
    position_seconds: number;
    duration_seconds: number;
    version: number;
    controller_session_id: string | null;
    active_playlist_id: number | null;
    active_playlist_track_id: number | null;
    controller_device_id: string | null;
    updated_at: string;
};

export type PlaybackEvent = {
    type: string;
    version: number;
    payload: PlaybackSnapshot;
};

export type PlaybackSession = {
    session_id: string;
    shared: boolean;
    owner_id: string;
    owner_name: string | null;
    playlist_id: number | null;
    track: { id: number | null; video_id: string; title: string | null; channel_title: string | null; thumbnail_url: string | null } | null;
    status: PlaybackSnapshot['status'];
    position_seconds: number;
    duration_seconds: number;
    version: number;
    controller_device_id: string | null;
    controller_device_name: string | null;
    updated_at: string;
};

export type PlaybackCommand = 'load' | 'play' | 'pause' | 'seek' | 'checkpoint';

export type PlaybackCommandPayload = {
    video_id?: string;
    position_seconds?: number;
    duration_seconds?: number;
    device_id?: string;
    expected_version?: number;
};
