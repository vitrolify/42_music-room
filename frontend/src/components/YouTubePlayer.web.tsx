import { forwardRef, useEffect, useRef } from 'react';
import { View } from 'react-native';
import {
    playerContainerStyles,
    PROGRESS_UPDATE_INTERVAL_MS,
    readProgress,
    stateFromYouTubeCode,
    useYouTubePlayerHandle,
    youtubeErrorMessage,
    type PlayerCommand,
} from './YouTubePlayer.shared';
import type { YouTubePlayerHandle, YouTubePlayerProps } from './YouTubePlayer.types';

type YouTubeApiPlayer = {
    playVideo: () => void;
    pauseVideo: () => void;
    cueVideoById: (videoId: string) => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    destroy: () => void;
};

type YouTubeApi = {
    Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubeApiPlayer;
};

let apiPromise: Promise<YouTubeApi> | null = null;

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer(props, ref) {
    const hostRef = useRef<HTMLElement | null>(null);
    const playerRef = useRef<YouTubeApiPlayer | null>(null);
    const readyRef = useRef(false);
    const videoIdRef = useRef(props.videoId);
    const propsRef = useRef(props);
    const queuedCommandsRef = useRef<Array<() => void>>([]);

    propsRef.current = props;
    videoIdRef.current = props.videoId;

    const runWhenReady = (command: (player: YouTubeApiPlayer) => void) => {
        if (playerRef.current && readyRef.current) {
            command(playerRef.current);
            return;
        }
        queuedCommandsRef.current.push(() => {
            if (playerRef.current) command(playerRef.current);
        });
    };

    useYouTubePlayerHandle(ref, props.videoId, command => {
        runWhenReady(player => runPlayerCommand(player, command));
    });

    useEffect(() => {
        let disposed = false;
        let progressTimer: ReturnType<typeof setInterval> | null = null;

        void loadYouTubeApi().then(YT => {
            if (disposed || !hostRef.current) return;
            playerRef.current = new YT.Player(hostRef.current, {
                width: '100%',
                height: '100%',
                videoId: videoIdRef.current,
                playerVars: {
                    enablejsapi: 1,
                    playsinline: 1,
                    rel: 0,
                    controls: 0,
                    modestbranding: 1,
                    iv_load_policy: 3,
                    disablekb: 1,
                    fs: 0,
                    origin: window.location.origin,
                },
                events: {
                    onReady: () => {
                        if (disposed || !playerRef.current) return;
                        readyRef.current = true;
                        propsRef.current.onReady?.();
                        queuedCommandsRef.current.splice(0).forEach(command => command());
                        emitProgress(playerRef.current, propsRef.current.onProgress);
                        progressTimer = setInterval(() => {
                            if (playerRef.current) emitProgress(playerRef.current, propsRef.current.onProgress);
                        }, PROGRESS_UPDATE_INTERVAL_MS);
                    },
                    onStateChange: (event: { data: number }) => {
                        const state = stateFromYouTubeCode(event.data);
                        if (state) propsRef.current.onStateChange?.(state);
                        if (playerRef.current) emitProgress(playerRef.current, propsRef.current.onProgress);
                    },
                    onError: (event: { data: number }) => propsRef.current.onError?.(youtubeErrorMessage(event.data)),
                },
            });
        }).catch(() => propsRef.current.onError?.('Unable to load the YouTube player.'));

        return () => {
            disposed = true;
            if (progressTimer) clearInterval(progressTimer);
            readyRef.current = false;
            queuedCommandsRef.current = [];
            playerRef.current?.destroy();
            playerRef.current = null;
        };
    }, []);

    return <View ref={hostRef as never} style={playerContainerStyles.container} />;
});

export default YouTubePlayer;

function loadYouTubeApi(): Promise<YouTubeApi> {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        const globalWindow = window as typeof window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
        if (globalWindow.YT?.Player) {
            resolve(globalWindow.YT);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => reject(new Error('Unable to load YouTube API'));
        const previousReady = globalWindow.onYouTubeIframeAPIReady;
        globalWindow.onYouTubeIframeAPIReady = () => {
            previousReady?.();
            if (globalWindow.YT?.Player) resolve(globalWindow.YT);
            else reject(new Error('YouTube API unavailable'));
        };
        document.head.appendChild(script);
    });
    return apiPromise;
}

function emitProgress(player: YouTubeApiPlayer, onProgress: YouTubePlayerProps['onProgress']) {
    onProgress?.(readProgress({ currentTime: player.getCurrentTime(), duration: player.getDuration() }));
}

function runPlayerCommand(player: YouTubeApiPlayer, command: PlayerCommand) {
    if (command.type === 'load') player.cueVideoById(command.videoId);
    if (command.type === 'play') player.playVideo();
    if (command.type === 'pause') player.pauseVideo();
    if (command.type === 'seek') player.seekTo(command.seconds, true);
}
