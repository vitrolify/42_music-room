export type YouTubePlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';

export type YouTubePlayerHandle = {
    loadVideo: (videoId: string) => void;
    play: () => void;
    pause: () => void;
    seekTo: (seconds: number) => void;
};

export type YouTubePlayerProgress = { currentTime: number; duration: number };

export type YouTubePlayerProps = {
    videoId: string;
    onReady?: () => void;
    onStateChange?: (state: YouTubePlayerState) => void;
    onProgress?: (progress: YouTubePlayerProgress) => void;
    onError?: (message: string) => void;
};
