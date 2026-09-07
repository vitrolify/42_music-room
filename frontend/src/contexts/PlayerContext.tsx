import { createContext, use, useCallback, useEffect, useRef, useState } from 'react';
import type {
    YouTubePlayerHandle,
    YouTubePlayerProgress,
    YouTubePlayerState,
} from '../components/YouTubePlayer.types';
import type { PlaybackSnapshot, SyncStatus } from '../lib/api/playback.types';
import { usePlaybackSync } from '../hooks/usePlaybackSync';
import { useAuth } from './AuthContext';
import { commandPlaylistPlayback } from '../lib/api/playlistTracks';
import { registerCurrentDevice } from '../lib/deviceIdentity';

type PlayerContextType = {
    videoId: string | null;
    videoTitle: string | null;
    thumbnailUrl: string | null;
    playerState: YouTubePlayerState;
    playerReady: boolean;
    progress: YouTubePlayerProgress;
    playerRef: React.RefObject<YouTubePlayerHandle | null>;
    syncStatus: SyncStatus;
    sessionId: string;
    serverVersion: number;
    activePlaylistId: number | null;
    togglePlayPause: () => void;
    play: () => void;
    pause: () => void;
    skip: () => void;
    commandPlaylistTrack: (playlistId: number, trackId: number, command: 'play' | 'pause' | 'skip') => Promise<void>;
    seekTo: (seconds: number) => void;
    setPlayerReady: (ready: boolean) => void;
    setPlayerState: (state: YouTubePlayerState) => void;
    setProgress: (progress: YouTubePlayerProgress) => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

function PlayerProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [playerState, setPlayerState] = useState<YouTubePlayerState>('unstarted');
    const [playerReady, setPlayerReadyState] = useState(false);
    const [progress, setProgress] = useState<YouTubePlayerProgress>({ currentTime: 0, duration: 0 });
    const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);

    const playerRef = useRef<YouTubePlayerHandle | null>(null);
    const playerStateRef = useRef(playerState);
    const playerReadyRef = useRef(playerReady);
    const progressRef = useRef(progress);
    const videoIdRef = useRef(videoId);
    const autoplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoplayVersionRef = useRef<number | null>(null);
    const endedVersionRef = useRef<number | null>(null);
    const lastCheckpointRef = useRef({ time: 0, position: -1 });
    playerStateRef.current = playerState;
    playerReadyRef.current = playerReady;
    progressRef.current = progress;
    videoIdRef.current = videoId;

    const loadMetadata = useCallback(async (id: string) => {
        try {
            const response = await fetch(
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}&format=json`,
            );
            if (!response.ok) return;
            const data = await response.json();
            setVideoTitle(data.title ?? null);
            setThumbnailUrl(data.thumbnail_url ?? null);
        } catch {
            // YouTube oEmbed metadata is best-effort.
        }
    }, []);

    const applySnapshot = useCallback((snapshot: PlaybackSnapshot) => {
        setActivePlaylistId(snapshot.active_playlist_id);
        if (autoplayTimerRef.current) {
            clearTimeout(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
        }

        if (snapshot.video_id && snapshot.video_id !== videoIdRef.current) {
            videoIdRef.current = snapshot.video_id;
            setVideoId(snapshot.video_id);
            playerRef.current?.loadVideo(snapshot.video_id);
            setVideoTitle(null);
            setThumbnailUrl(null);
            void loadMetadata(snapshot.video_id);
        }

        const elapsedSeconds = snapshot.status === 'playing'
            ? Math.max(0, (Date.now() - Date.parse(snapshot.updated_at)) / 1000)
            : 0;
        const targetPosition = snapshot.position_seconds + elapsedSeconds;
        if (Math.abs(progressRef.current.currentTime - targetPosition) > 1) {
            playerRef.current?.seekTo(targetPosition);
        }

        if (snapshot.status === 'playing') {
            autoplayVersionRef.current = snapshot.version;
            playerRef.current?.play();
            autoplayTimerRef.current = setTimeout(() => {
                autoplayTimerRef.current = null;
                if (
                    playerReadyRef.current
                    && autoplayVersionRef.current === snapshot.version
                    && sync.isCurrentSnapshot(snapshot.version)
                    && playerStateRef.current !== 'playing'
                ) {
                    sync.markAutoplayBlocked();
                }
            }, 2000);
        } else {
            autoplayVersionRef.current = null;
            playerRef.current?.pause();
        }

        setProgress({ currentTime: targetPosition, duration: snapshot.duration_seconds });
    }, [loadMetadata]);

    const sync = usePlaybackSync({ isAuthenticated: Boolean(user), onSnapshot: applySnapshot });

    useEffect(() => () => {
        if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current);
    }, []);

    const handlePlayerReady = useCallback((ready: boolean) => {
        setPlayerReadyState(ready);
        playerReadyRef.current = ready;

        if (
            ready
            && autoplayVersionRef.current !== null
            && playerStateRef.current !== 'playing'
        ) {
            playerRef.current?.play();
            if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current);
            const version = autoplayVersionRef.current;
            autoplayTimerRef.current = setTimeout(() => {
                autoplayTimerRef.current = null;
                if (
                    autoplayVersionRef.current === version
                    && sync.isCurrentSnapshot(version)
                    && playerStateRef.current !== 'playing'
                ) {
                    sync.markAutoplayBlocked();
                }
            }, 2000);
        }
    }, [sync.isCurrentSnapshot, sync.markAutoplayBlocked]);

    const commandPlaylistTrack = useCallback(async (
        playlistId: number,
        playlistTrackId: number,
        command: 'play' | 'pause' | 'seek' | 'checkpoint' | 'skip' | 'ended',
        positionSeconds?: number,
        durationSeconds?: number,
    ) => {
        try {
            const deviceId = await registerCurrentDevice();
            const response = await commandPlaylistPlayback(playlistId, {
                command,
                playlist_track_id: playlistTrackId,
                device_id: deviceId,
                session_id: sync.sessionId,
                expected_version: sync.serverVersion,
                position_seconds: positionSeconds,
                duration_seconds: durationSeconds,
            });
            sync.applyCommandSnapshot(response.payload);
        } catch {
            // The realtime snapshot remains authoritative; a later reconnect retries hydration.
        }
    }, [sync]);

    const sendPlaylistCommand = useCallback((
        command: 'play' | 'pause' | 'seek' | 'checkpoint' | 'skip' | 'ended',
        positionSeconds?: number,
        durationSeconds?: number,
    ) => {
        if (!activePlaylistId || !sync.activePlaylistTrackId) return Promise.resolve();
        return commandPlaylistTrack(activePlaylistId, sync.activePlaylistTrackId, command, positionSeconds, durationSeconds);
    }, [activePlaylistId, commandPlaylistTrack, sync.activePlaylistTrackId]);

    const handlePlayerState = useCallback((state: YouTubePlayerState) => {
        setPlayerState(state);
        if (state === 'playing') {
            autoplayVersionRef.current = null;
            if (autoplayTimerRef.current) {
                clearTimeout(autoplayTimerRef.current);
                autoplayTimerRef.current = null;
            }
            sync.markPlaybackStarted();
        }
        if (state === 'ended' && endedVersionRef.current !== sync.serverVersion) {
            endedVersionRef.current = sync.serverVersion;
            void sendPlaylistCommand('ended', progressRef.current.currentTime, progressRef.current.duration);
        }
    }, [sendPlaylistCommand, sync.markPlaybackStarted, sync.serverVersion]);

    const play = useCallback(() => {
        playerRef.current?.play();
        void sendPlaylistCommand('play', progressRef.current.currentTime, progressRef.current.duration);
    }, [sendPlaylistCommand]);

    const pause = useCallback(() => {
        playerRef.current?.pause();
        void sendPlaylistCommand('pause', progressRef.current.currentTime, progressRef.current.duration);
    }, [sendPlaylistCommand]);

    const skip = useCallback(() => {
        void sendPlaylistCommand('skip', progressRef.current.currentTime, progressRef.current.duration);
    }, [sendPlaylistCommand]);

    const togglePlayPause = useCallback(() => {
        if (playerStateRef.current === 'playing') pause();
        else if (sync.syncStatus === 'autoplay-blocked') {
            const syncedPosition = sync.getCurrentPosition();
            const position = syncedPosition ?? progressRef.current.currentTime;
            playerRef.current?.seekTo(position);
            setProgress(current => ({ ...current, currentTime: position }));
            void sendPlaylistCommand('play', position, progressRef.current.duration);
        } else play();
    }, [pause, play, sendPlaylistCommand, sync.getCurrentPosition, sync.syncStatus]);

    const seekTo = useCallback((seconds: number) => {
        playerRef.current?.seekTo(seconds);
        setProgress(current => ({ ...current, currentTime: seconds }));
        void sendPlaylistCommand('seek', seconds, progressRef.current.duration);
    }, [sendPlaylistCommand]);

    const reportProgress = useCallback((next: YouTubePlayerProgress) => {
        setProgress(next);
        const now = Date.now();
        if (
            sync.isController
            && playerStateRef.current === 'playing'
            && now - lastCheckpointRef.current.time >= 700
            && Math.abs(next.currentTime - lastCheckpointRef.current.position) >= 0.25
        ) {
            lastCheckpointRef.current = { time: now, position: next.currentTime };
            void sendPlaylistCommand('checkpoint', next.currentTime, next.duration);
        }
    }, [sendPlaylistCommand, sync.isController]);

    return (
        <PlayerContext.Provider value={{
            videoId,
            videoTitle,
            thumbnailUrl,
            playerState,
            playerReady,
            progress,
            playerRef,
            syncStatus: sync.syncStatus,
            sessionId: sync.sessionId,
            serverVersion: sync.serverVersion,
            activePlaylistId,
            togglePlayPause,
            play,
            pause,
            skip,
            commandPlaylistTrack,
            seekTo,
            setPlayerReady: handlePlayerReady,
            setPlayerState: handlePlayerState,
            setProgress: reportProgress,
        }}>
            {children}
        </PlayerContext.Provider>
    );
}

function usePlayer() {
    const context = use(PlayerContext);
    if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
    return context;
}

export { PlayerContext, PlayerProvider, usePlayer };
