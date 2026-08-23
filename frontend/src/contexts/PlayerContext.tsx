import { createContext, useCallback, useRef, useState, use } from 'react';
import type { YouTubePlayerHandle, YouTubePlayerProgress, YouTubePlayerState } from '../components/YouTubePlayer.types';

type PlayerContextType = {
    videoId: string | null;
    videoTitle: string | null;
    thumbnailUrl: string | null;
    playerState: YouTubePlayerState;
    playerReady: boolean;
    progress: YouTubePlayerProgress;
    playerRef: React.RefObject<YouTubePlayerHandle | null>;
    showPlayer: boolean;
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
    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [playerState, setPlayerState] = useState<YouTubePlayerState>('unstarted');
    const [playerReady, setPlayerReady] = useState(false);
    const [progress, setProgress] = useState<YouTubePlayerProgress>({ currentTime: 0, duration: 0 });
    const playerRef = useRef<YouTubePlayerHandle | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);

    const playerStateRef = useRef(playerState);
    playerStateRef.current = playerState;

    const loadVideo = useCallback(async (id: string) => {
        setVideoId(id);
        setPlayerState('unstarted');
        setProgress({ currentTime: 0, duration: 0 });
        setVideoTitle(null);
        setThumbnailUrl(null);

        // Force reload even if the video ID is the same (setVideoId is a no-op for identical values)
        playerRef.current?.loadVideo(id);

        try {
            const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}&format=json`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setVideoTitle(data.title ?? null);
                setThumbnailUrl(data.thumbnail_url ?? null);
            }
        } catch {
            // oEmbed is best-effort; fall back to null
        }
    }, []);

    const play = useCallback(() => {
        playerRef.current?.play();
    }, []);

    const pause = useCallback(() => {
        playerRef.current?.pause();
    }, []);

    const togglePlayPause = useCallback(() => {
        if (playerStateRef.current === 'playing') {
            playerRef.current?.pause();
        } else {
            playerRef.current?.play();
        }
    }, []);

    const seekTo = useCallback((seconds: number) => {
        playerRef.current?.seekTo(seconds);
    }, []);

    return (
        <PlayerContext.Provider
            value={{
                videoId,
                videoTitle,
                thumbnailUrl,
                playerState,
                playerReady,
                progress,
                playerRef,
                showPlayer,
                loadVideo,
                togglePlayPause,
                play,
                pause,
                seekTo,
                setPlayerReady,
                setPlayerState,
                setProgress,
                setShowPlayer,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

function usePlayer() {
    const context = use(PlayerContext);
    if (!context) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
}

export { PlayerContext, PlayerProvider, usePlayer };
