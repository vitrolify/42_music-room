export type YouTubePlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';

export type YouTubePlayerHandle = {
    loadVideo: (videoId: string) => void;
    play: () => void;
    pause: () => void;
};

export type YouTubePlayerProps = {
    videoId: string;
    onReady?: () => void;
    onStateChange?: (state: YouTubePlayerState) => void;
    onError?: (message: string) => void;
};
