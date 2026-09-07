import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { Pause, Play, SkipForward } from 'phosphor-react-native';
import YouTubePlayer from './YouTubePlayer';
import ProgressBar from './ProgressBar';
import { usePlayer } from '../contexts/PlayerContext';
import { colors, globalStyles, spacing } from '../styles';

/**
 * The YouTube instance lives beside the tab navigator, not inside a route.
 * Its surface is only exposed while the route is the hydrated active playlist,
 * so changing tabs never recreates or interrupts the underlying player.
 */
export default function PersistentPlayerHost() {
    const pathname = usePathname();
    const [error, setError] = useState<string | null>(null);
    const {
        videoId,
        videoTitle,
        thumbnailUrl,
        playerState,
        playerReady,
        progress,
        playerRef,
        activePlaylistId,
        togglePlayPause,
        skip,
        seekTo,
        setPlayerReady,
        setPlayerState,
        setProgress,
        syncStatus,
    } = usePlayer();

    const isActivePlaylistRoute = activePlaylistId !== null
        && new RegExp(`/playlist/${activePlaylistId}(?:/|$)`).test(pathname);

    if (!videoId) return null;

    return (
        <View pointerEvents={isActivePlaylistRoute ? 'auto' : 'none'} style={styles.host}>
            <View style={[styles.surface, !isActivePlaylistRoute && styles.hidden]}>
                <View style={styles.headingRow}>
                    {thumbnailUrl ? <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} /> : null}
                    <View style={{ flex: 1 }}>
                        <Text style={globalStyles.heading} numberOfLines={1}>{videoTitle ?? 'Now Playing'}</Text>
                        <Text style={globalStyles.small}>Active playlist</Text>
                    </View>
                </View>
                <YouTubePlayer
                    ref={playerRef}
                    videoId={videoId}
                    onReady={() => setPlayerReady(true)}
                    onStateChange={setPlayerState}
                    onProgress={setProgress}
                    onError={setError}
                />
                <View style={styles.controls}>
                    <Pressable
                        style={({ pressed }) => [styles.roundButton, { opacity: !playerReady || pressed ? 0.55 : 1 }]}
                        onPress={togglePlayPause}
                        disabled={!playerReady}
                    >
                        {playerState === 'playing'
                            ? <Pause weight="fill" size={24} color={colors.text.primary} />
                            : <Play weight="fill" size={24} color={colors.text.primary} />}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <ProgressBar currentTime={progress.currentTime} duration={progress.duration} onSeek={seekTo} variant="full" />
                    </View>
                    <Pressable style={styles.skipButton} onPress={skip}>
                        <SkipForward weight="fill" size={22} color={colors.text.primary} />
                    </Pressable>
                </View>
                {syncStatus === 'autoplay-blocked' ? <Text style={globalStyles.small}>Tap play to start synchronized playback.</Text> : null}
                {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
            </View>
        </View>
    );
}

export const ACTIVE_PLAYER_SURFACE_HEIGHT = 332;

const styles = StyleSheet.create({
    host: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 },
    surface: { padding: spacing.lg, backgroundColor: colors.bg.base, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.gray },
    hidden: { opacity: 0, height: 0, overflow: 'hidden', padding: 0, borderBottomWidth: 0 },
    headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    thumbnail: { width: 40, height: 40, borderRadius: 4 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
    roundButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
    skipButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
