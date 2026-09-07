import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Play, Pause } from 'phosphor-react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { colors, fonts, spacing } from '../styles';
import ProgressBar, { formatTime } from './ProgressBar';

const BAR_HEIGHT = 64;

export default function MiniPlayerBar({ onPress }: { onPress?: () => void }) {
    const { videoId, videoTitle, thumbnailUrl, playerState, progress, togglePlayPause, seekTo, syncStatus } = usePlayer();
    const [titleHovered, setTitleHovered] = useState(false);

    if (!videoId) return null;

    const isPlaying = playerState === 'playing';
    const ratio = progress.duration > 0
        ? Math.min(Math.max(progress.currentTime / progress.duration, 0), 1)
        : 0;

    const isWeb = Platform.OS === 'web';

    return (
        <Pressable
            onPress={onPress}
            style={styles.container}
        >
            <View style={styles.content}>
                {thumbnailUrl ? (
                    <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
                ) : (
                    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
                )}

                <View
                    style={styles.titleWrapper}
                    {...(Platform.OS === 'web'
                        ? { onMouseEnter: () => setTitleHovered(true), onMouseLeave: () => setTitleHovered(false) }
                        : {})}
                >
                    <Text
                        style={[
                            styles.titleText,
                            Platform.OS === 'web' && styles.titleTextWeb,
                            titleHovered && { textDecorationLine: 'underline' },
                        ]}
                        numberOfLines={1}
                    >
                        {videoTitle ?? 'Now Playing'}
                    </Text>
                </View>

                {isWeb && (
                    <View style={styles.webProgressRow}>
                        <Text style={styles.timeText}>{formatTime(progress.currentTime)}</Text>
                        <View style={styles.webProgressTrack}>
                            <ProgressBar
                                currentTime={progress.currentTime}
                                duration={progress.duration}
                                onSeek={seekTo}
                                variant="mini"
                            />
                        </View>
                        <Text style={styles.timeText}>{progress.duration > 0 ? formatTime(progress.duration) : '--:--'}</Text>
                    </View>
                )}

                {syncStatus === 'autoplay-blocked' ? (
                    <Pressable
                        onPress={(e) => { e.stopPropagation?.(); togglePlayPause(); }}
                        style={styles.syncWarning}
                    >
                        <Text style={styles.syncWarningText}>Tap to sync</Text>
                    </Pressable>
                ) : null}

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
            </View>

            {!isWeb && (
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
                </View>
            )}
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
    thumbnail: {
        width: 80,
        height: 45,
        borderRadius: 4,
        backgroundColor: colors.bg.card,
    },
    thumbnailPlaceholder: {
        backgroundColor: colors.bg.elevated,
    },
    titleWrapper: {
        flex: 1,
        marginLeft: spacing.md,
    },
    titleText: {
        color: colors.text.primary,
        fontFamily: fonts.bodySemiBold,
        fontSize: 13,
        lineHeight: 18,
    },
    titleTextWeb: {
        cursor: 'pointer',
    } as any,
    webProgressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: spacing.md,
    },
    webProgressTrack: {
        flex: 1,
        marginHorizontal: spacing.sm,
    },
    timeText: {
        color: colors.text.secondary,
        fontFamily: fonts.body,
        fontSize: 11,
        minWidth: 32,
        textAlign: 'center',
    },
    playButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
    },
    syncWarning: {
        marginRight: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 10,
        backgroundColor: colors.brand,
    },
    syncWarningText: {
        color: colors.text.primary,
        fontSize: 11,
        fontFamily: fonts.body,
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
