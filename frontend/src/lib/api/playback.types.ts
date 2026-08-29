export type SyncStatus = 'connecting' | 'synced' | 'offline' | 'autoplay-blocked';

export type PlaybackSnapshot = {
    video_id: string;
    status: 'playing' | 'paused';
    position_seconds: number;
    duration_seconds: number;
    version: number;
    controller_session_id: string | null;
    updated_at: string;
};

export type PlaybackEvent = {
    type: string;
    version: number;
    payload: PlaybackSnapshot;
};

export type PlaybackCommand = 'load' | 'play' | 'pause' | 'seek' | 'checkpoint';

export type PlaybackCommandPayload = {
    video_id?: string;
    position_seconds?: number;
    duration_seconds?: number;
};
