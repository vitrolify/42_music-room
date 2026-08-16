import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../styles';
import type { YouTubePlayerProps } from './YouTubePlayer.native';

export default function YouTubePlayer({ videoId, onError }: YouTubePlayerProps) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(origin)}`;

    return (
        <View style={styles.container}>
            {createElement('iframe', {
                src: embedUrl,
                title: 'YouTube video player',
                allow: 'autoplay; encrypted-media; picture-in-picture',
                allowFullScreen: true,
                referrerPolicy: 'strict-origin-when-cross-origin',
                onError: () => onError?.('Unable to load the YouTube player.'),
                style: styles.iframe,
            })}
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
    iframe: {
        width: '100%',
        height: '100%',
        borderWidth: 0,
        backgroundColor: colors.bg.card,
    },
});
