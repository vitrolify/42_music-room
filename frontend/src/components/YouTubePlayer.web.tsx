import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../styles';
import type { YouTubePlayerHandle, YouTubePlayerProps, YouTubePlayerState } from './YouTubePlayer.types';

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
    { videoId, onReady, onStateChange, onError },
    ref,
) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(origin)}`;

    useImperativeHandle(ref, () => ({
        loadVideo: nextVideoId => sendCommand(iframeRef, 'loadVideoById', [nextVideoId]),
        play: () => sendCommand(iframeRef, 'playVideo'),
        pause: () => sendCommand(iframeRef, 'pauseVideo'),
    }), []);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://www.youtube.com' && event.origin !== 'https://www.youtube-nocookie.com') return;
            if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
            let message: { event?: string; info?: number };
            try { message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
            if (message.event === 'onReady') onReady?.();
            if ((message.event === 'onStateChange' || message.event === 'infoDelivery') && message.info !== undefined) {
                const stateCode = typeof message.info === 'number'
                    ? message.info
                    : (message.info as unknown as { playerState?: number }).playerState;
                const state = stateFromCode(stateCode);
                if (state) onStateChange?.(state);
            }
            if (message.event === 'onError') onError?.(youtubeErrorMessage(message.info));
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onError, onReady, onStateChange]);

    return (
        <View style={styles.container}>
            {createElement('iframe', {
                ref: iframeRef,
                src: embedUrl,
                onLoad: () => {
                    sendMessage(iframeRef, { event: 'listening', id: 'vitrolify-player', channel: 'vitrolify' });
                    sendMessage(iframeRef, { event: 'command', func: 'addEventListener', args: ['onReady'], id: 'vitrolify-player', channel: 'vitrolify' });
                    sendMessage(iframeRef, { event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 'vitrolify-player', channel: 'vitrolify' });
                    sendMessage(iframeRef, { event: 'command', func: 'addEventListener', args: ['onError'], id: 'vitrolify-player', channel: 'vitrolify' });
                },
                title: 'YouTube video player',
                allow: 'autoplay; encrypted-media; picture-in-picture',
                allowFullScreen: true,
                referrerPolicy: 'strict-origin-when-cross-origin',
                onError: () => onError?.('Unable to load the YouTube player.'),
                style: styles.iframe,
            })}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        aspectRatio: 16 / 9,
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: colors.bg.card,
    },
    iframe: {
        width: '100%',
        height: '100%',
        borderWidth: 0,
        backgroundColor: colors.bg.card,
    },
});

export default YouTubePlayer;

function sendCommand(iframeRef: RefObject<HTMLIFrameElement | null>, func: string, args: unknown[] = []) {
    sendMessage(iframeRef, { event: 'command', func, args, id: 'vitrolify-player', channel: 'vitrolify' });
}

function sendMessage(iframeRef: RefObject<HTMLIFrameElement | null>, message: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), 'https://www.youtube.com');
}

function stateFromCode(code: number | undefined): YouTubePlayerState | null {
    return ({ '-1': 'unstarted', '0': 'ended', '1': 'playing', '2': 'paused', '3': 'buffering', '5': 'cued' } as Record<string, YouTubePlayerState>)[String(code)] ?? null;
}

function youtubeErrorMessage(code?: number) {
    if (code === 100) return 'This video was not found or is private.';
    if (code === 101 || code === 150) return 'This video does not allow embedded playback.';
    if (code === 153) return 'YouTube could not verify the player origin.';
    return 'YouTube could not play this video.';
}
