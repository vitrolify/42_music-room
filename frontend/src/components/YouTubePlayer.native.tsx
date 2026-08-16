import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, fonts, spacing } from '../styles';
import type { YouTubePlayerHandle, YouTubePlayerProps, YouTubePlayerState } from './YouTubePlayer.types';

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
    { videoId, onReady, onStateChange, onProgress, onError },
    ref,
) {
    const webViewRef = useRef<WebView>(null);
    const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&playsinline=1&rel=0&origin=https%3A%2F%2Fvitrolify.app`;
    const html = `<!doctype html>
<html>
  <head>
    <script>window.__ytVideoId = ${JSON.stringify(videoId)};</script>
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>html, body, iframe { margin: 0; width: 100%; height: 100%; border: 0; background: #1f1f1f; }</style>
  </head>
  <body><div id="player"></div><script>
    (function() {
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.__send = function(payload) { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); };
      window.onYouTubeIframeAPIReady = function() {
        window.__ytPlayer = new YT.Player('player', {
          videoId: window.__ytVideoId,
          playerVars: { playsinline: 1, enablejsapi: 1, rel: 0, origin: 'https://vitrolify.app' },
          events: {
            onReady: function() { window.__send({ type: 'ready' }); window.__ytFlush(); window.__ytProgress(); },
            onStateChange: function(event) { window.__send({ type: 'state', value: event.data }); },
            onError: function(event) { window.__send({ type: 'error', value: event.data }); }
          }
        });
      };
      window.__ytPending = [];
      window.__ytCommand = function(command, value) {
        if (!window.__ytPlayer) { window.__ytPending.push([command, value]); return; }
        if (command === 'play') window.__ytPlayer.playVideo();
        if (command === 'pause') window.__ytPlayer.pauseVideo();
        if (command === 'load' && value) window.__ytPlayer.cueVideoById(value);
        if (command === 'seek' && value) window.__ytPlayer.seekTo(Number(value), true);
      };
      window.__ytFlush = function() {
        var pending = window.__ytPending.splice(0);
        pending.forEach(function(item) { window.__ytCommand(item[0], item[1]); });
      };
      window.__ytProgress = function() {
        if (!window.__ytPlayer) return;
        window.__send({ type: 'progress', currentTime: window.__ytPlayer.getCurrentTime() || 0, duration: window.__ytPlayer.getDuration() || 0 });
      };
      window.__ytProgressTimer = setInterval(function() {
        if (window.__ytPlayer && window.__ytPlayer.getPlayerState() === 1) window.__ytProgress();
      }, 500);
    }());
  </script></body>
</html>`;

    useImperativeHandle(ref, () => ({
        loadVideo: nextVideoId => sendCommand(webViewRef, 'load', nextVideoId),
        play: () => sendCommand(webViewRef, 'play'),
        pause: () => sendCommand(webViewRef, 'pause'),
        seekTo: seconds => sendCommand(webViewRef, 'seek', String(seconds)),
    }), []);

    useEffect(() => {
        sendCommand(webViewRef, 'load', videoId);
    }, [videoId]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ html, baseUrl: 'https://vitrolify.app/' }}
                style={styles.webView}
                originWhitelist={['https://*']}
                allowsInlineMediaPlayback
                // The external app button triggers playVideo() through injected JS.
                // Requiring a gesture inside the WebView prevents Android from
                // honoring that command for an unstarted YouTube player.
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color={colors.brand} />
                        <Text style={styles.loadingText}>Loading YouTube player...</Text>
                    </View>
                )}
                onError={() => onError?.('Unable to load the YouTube player.')}
                onHttpError={() => onError?.('YouTube returned an error while loading this video.')}
                onMessage={event => {
                    try {
                        const message = JSON.parse(event.nativeEvent.data) as { type?: string; value?: number; currentTime?: number; duration?: number };
                        if (message.type === 'ready') onReady?.();
                        if (message.type === 'state' && message.value !== undefined) {
                            const state = stateFromCode(message.value);
                            if (state) onStateChange?.(state);
                        }
                        if (message.type === 'progress') onProgress?.({ currentTime: message.currentTime ?? 0, duration: message.duration ?? 0 });
                        if (message.type === 'error') onError?.(youtubeErrorMessage(message.value));
                    } catch {
                        onError?.('The YouTube player sent an invalid event.');
                    }
                }}
            />
        </View>
    );
});

export default YouTubePlayer;

function sendCommand(webViewRef: RefObject<WebView | null>, command: string, value?: string) {
    const serializedValue = value ? JSON.stringify(value) : 'undefined';
    webViewRef.current?.injectJavaScript(`window.__ytCommand(${JSON.stringify(command)}, ${serializedValue}); true;`);
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
    webView: {
        flex: 1,
        backgroundColor: colors.bg.card,
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bg.card,
    },
    loadingText: {
        color: colors.text.secondary,
        fontFamily: fonts.body,
        fontSize: 12,
    },
});
