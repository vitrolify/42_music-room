import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, fonts, spacing } from '../styles';

export type YouTubePlayerProps = {
    videoId: string;
    onError?: (message: string) => void;
};

export default function YouTubePlayer({ videoId, onError }: YouTubePlayerProps) {
    const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&playsinline=1&rel=0&origin=https%3A%2F%2Fvitrolify.app`;
    const html = `<!doctype html>
<html>
  <head>
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>html, body, iframe { margin: 0; width: 100%; height: 100%; border: 0; background: #1f1f1f; }</style>
  </head>
  <body><iframe src="${embedUrl}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></body>
</html>`;

    return (
        <View style={styles.container}>
            <WebView
                source={{ html, baseUrl: 'https://vitrolify.app/' }}
                style={styles.webView}
                originWhitelist={['https://*']}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction
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
            />
        </View>
    );
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
