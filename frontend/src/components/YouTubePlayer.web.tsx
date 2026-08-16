import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../styles';
import type { YouTubePlayerHandle, YouTubePlayerProps, YouTubePlayerState } from './YouTubePlayer.types';

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

    useImperativeHandle(ref, () => ({
        loadVideo: videoId => runWhenReady(player => player.cueVideoById(videoId)),
        play: () => runWhenReady(player => player.playVideo()),
        pause: () => runWhenReady(player => player.pauseVideo()),
        seekTo: seconds => runWhenReady(player => player.seekTo(seconds, true)),
    }), []);

    useEffect(() => {
        if (readyRef.current) playerRef.current?.cueVideoById(props.videoId);
    }, [props.videoId]);

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
                        }, 500);
                    },
                    onStateChange: (event: { data: number }) => {
                        const state = stateFromCode(event.data);
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

    return <View ref={hostRef as never} style={styles.container} />;
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
    onProgress?.({ currentTime: player.getCurrentTime() || 0, duration: player.getDuration() || 0 });
}

function stateFromCode(code: number): YouTubePlayerState | null {
    return ({ '-1': 'unstarted', '0': 'ended', '1': 'playing', '2': 'paused', '3': 'buffering', '5': 'cued' } as Record<string, YouTubePlayerState>)[String(code)] ?? null;
}

function youtubeErrorMessage(code?: number) {
    if (code === 100) return 'This video was not found or is private.';
    if (code === 101 || code === 150) return 'This video does not allow embedded playback.';
    if (code === 153) return 'YouTube could not verify the player origin.';
    return 'YouTube could not play this video.';
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        aspectRatio: 16 / 9,
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: colors.bg.card,
    },
});
