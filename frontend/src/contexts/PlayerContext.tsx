import { createContext, use, useCallback, useRef, useState } from 'react';
import type {
    YouTubePlayerHandle,
    YouTubePlayerProgress,
    YouTubePlayerState,
} from '../components/YouTubePlayer.types';
import type { PlaybackSnapshot, SyncStatus } from '../lib/api/playback.types';
import { usePlaybackSync } from '../hooks/usePlaybackSync';
import { useAuth } from './AuthContext';

type PlayerContextType = {
    videoId: string | null;
    videoTitle: string | null;
    thumbnailUrl: string | null;
    playerState: YouTubePlayerState;
    playerReady: boolean;
    progress: YouTubePlayerProgress;
    playerRef: React.RefObject<YouTubePlayerHandle | null>;
    showPlayer: boolean;
    syncStatus: SyncStatus;
    sessionId: string;
    serverVersion: number;
    loadVideo: (videoId: string) => void;
    togglePlayPause: () => void;
    play: () => void;
    pause: () => void;
    seekTo: (seconds: number) => void;
    setPlayerReady: (ready: boolean) => void;
    setPlayerState: (state: YouTubePlayerState) => void;
    setProgress: (progress: YouTubePlayerProgress) => void;
    setShowPlayer: (show: boolean) => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

function PlayerProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [playerState, setPlayerState] = useState<YouTubePlayerState>('unstarted');
    const [playerReady, setPlayerReady] = useState(false);
    const [progress, setProgress] = useState<YouTubePlayerProgress>({ currentTime: 0, duration: 0 });
    const [showPlayer, setShowPlayer] = useState(false);

    const playerRef = useRef<YouTubePlayerHandle | null>(null);
    const playerStateRef = useRef(playerState);
    const progressRef = useRef(progress);
    const videoIdRef = useRef(videoId);
    playerStateRef.current = playerState;
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
            playerRef.current?.play();
            setTimeout(() => {
                if (
                    sync.isCurrentSnapshot(snapshot.version)
                    && playerStateRef.current !== 'playing'
                ) {
                    sync.markAutoplayBlocked();
                }
            }, 700);
        } else {
            playerRef.current?.pause();
        }

        setProgress({ currentTime: targetPosition, duration: snapshot.duration_seconds });
    }, [loadMetadata]);

    const sync = usePlaybackSync({ isAuthenticated: Boolean(user), onSnapshot: applySnapshot });

    const loadVideo = useCallback((id: string) => {
        videoIdRef.current = id;
        setVideoId(id);
        setPlayerState('unstarted');
        setProgress({ currentTime: 0, duration: 0 });
        playerRef.current?.loadVideo(id);
        setVideoTitle(null);
        setThumbnailUrl(null);
        void sync.sendCommand('load', { video_id: id, position_seconds: 0, duration_seconds: 0 });
        void loadMetadata(id);
    }, [loadMetadata, sync.sendCommand]);

    const play = useCallback(() => {
        playerRef.current?.play();
        void sync.sendCommand('play', { position_seconds: progressRef.current.currentTime });
    }, [sync.sendCommand]);

    const pause = useCallback(() => {
        playerRef.current?.pause();
        void sync.sendCommand('pause', { position_seconds: progressRef.current.currentTime });
    }, [sync.sendCommand]);

    const togglePlayPause = useCallback(() => {
        if (playerStateRef.current === 'playing') pause();
        else play();
    }, [pause, play]);

    const seekTo = useCallback((seconds: number) => {
        playerRef.current?.seekTo(seconds);
        setProgress(current => ({ ...current, currentTime: seconds }));
        void sync.sendCommand('seek', {
            position_seconds: seconds,
            duration_seconds: progressRef.current.duration,
        });
    }, [sync.sendCommand]);

    const reportProgress = useCallback((next: YouTubePlayerProgress) => {
        setProgress(next);
        sync.reportProgress(next.currentTime, next.duration);
    }, [sync.reportProgress]);

    return (
        <PlayerContext.Provider value={{
            videoId,
            videoTitle,
            thumbnailUrl,
            playerState,
            playerReady,
            progress,
            playerRef,
            showPlayer,
            syncStatus: sync.syncStatus,
            sessionId: sync.sessionId,
            serverVersion: sync.serverVersion,
            loadVideo,
            togglePlayPause,
            play,
            pause,
            seekTo,
            setPlayerReady,
            setPlayerState,
            setProgress: reportProgress,
            setShowPlayer,
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
