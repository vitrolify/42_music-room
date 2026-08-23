import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Play, Pause } from 'phosphor-react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { colors, fonts, spacing } from '../styles';
import PlayerEmbed from './PlayerEmbed';

const BAR_HEIGHT = 64;

export default function MiniPlayerBar({ onPress }: { onPress?: () => void }) {
    const { videoId, videoTitle, playerState, progress, togglePlayPause } = usePlayer();

    if (!videoId) return null;

    const isPlaying = playerState === 'playing';
    const ratio = progress.duration > 0
        ? Math.min(Math.max(progress.currentTime / progress.duration, 0), 1)
        : 0;

    return (
        <Pressable
            onPress={onPress}
            style={styles.container}
        >
            <View style={styles.content}>
                <PlayerEmbed />

                <View style={styles.titleContainer}>
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation?.();
                            togglePlayPause();
                        }}
                        style={styles.playButton}
                    >
                        {isPlaying ? (
                            <Pause weight="fill" size={24} color={colors.text.primary} />
                        ) : (
                            <Play weight="fill" size={24} color={colors.text.primary} />
                        )}
                    </Pressable>

                    <View style={styles.titleWrapper}>
                        <Text style={styles.titleText} numberOfLines={1}>
                            {videoTitle ?? 'Now Playing'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bg.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border.gray,
        height: BAR_HEIGHT,
        justifyContent: 'center',
        ...Platform.select({
            android: {
                elevation: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
        }),
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        height: BAR_HEIGHT,
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: spacing.md,
    },
    playButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWrapper: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    titleText: {
        color: colors.text.primary,
        fontFamily: fonts.bodySemiBold,
        fontSize: 13,
        lineHeight: 18,
    },
    progressTrack: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: colors.bg.elevated,
    },
    progressFill: {
        height: 2,
        backgroundColor: colors.brand,
    },
});
