import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause } from 'phosphor-react-native';
import YouTubePlayer from './YouTubePlayer';
import ProgressBar from './ProgressBar';
import { usePlayer } from '../contexts/PlayerContext';
import { colors, globalStyles, spacing } from '../styles';

export default function PlayerOverlay() {
    const insets = useSafeAreaInsets();
    const [error, setError] = useState<string | null>(null);

    const {
        videoId,
        videoTitle,
        thumbnailUrl,
        playerState,
        playerReady,
        progress,
        playerRef,
        showPlayer,
        togglePlayPause,
        setPlayerReady,
        setPlayerState,
        setProgress,
        setShowPlayer,
        seekTo,
        syncStatus,
    } = usePlayer();

    function handlePlayerError(message: string) {
        setError(message);
        Alert.alert('Player error', message);
    }

    const isPlaying = playerState === 'playing';

    return (
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                backgroundColor: colors.bg.base,
                opacity: showPlayer ? 1 : 0,
                pointerEvents: (showPlayer ? 'auto' : 'none') as any,
            }}
        >
            <ScrollView
                style={[globalStyles.screen, { paddingTop: insets.top + spacing.xl }]}
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }}
                keyboardShouldPersistTaps="handled"
            >
                <Pressable onPress={() => setShowPlayer(false)} style={{ marginBottom: spacing.xl }}>
                    <Text style={globalStyles.link}>Back</Text>
                </Pressable>

                {videoId ? (
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                            {thumbnailUrl ? (
                                <Image source={{ uri: thumbnailUrl }} style={{ width: 64, height: 64, borderRadius: 6 }} />
                            ) : null}
                            <View style={{ flex: 1, marginLeft: thumbnailUrl ? spacing.md : 0 }}>
                                <Text style={globalStyles.heading} numberOfLines={2}>
                                    {videoTitle ?? 'Now Playing'}
                                </Text>
                                <Text style={[globalStyles.small, { marginTop: spacing.xs }]}>
                                    Video ID: {videoId}
                                </Text>
                            </View>
                        </View>

                        <YouTubePlayer
                            ref={playerRef}
                            videoId={videoId}
                            onReady={() => setPlayerReady(true)}
                            onStateChange={setPlayerState}
                            onProgress={setProgress}
                            onError={handlePlayerError}
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md }}>
                            <Pressable
                                style={({ pressed }) => ({
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: colors.brand,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: !playerReady || pressed ? 0.55 : 1,
                                })}
                                onPress={togglePlayPause}
                                disabled={!playerReady}
                            >
                                {isPlaying ? (
                                    <Pause weight="fill" size={24} color={colors.text.primary} />
                                ) : (
                                    <Play weight="fill" size={24} color={colors.text.primary} />
                                )}
                            </Pressable>

                            <View style={{ flex: 1 }}>
                                <ProgressBar
                                    currentTime={progress.currentTime}
                                    duration={progress.duration}
                                    onSeek={seekTo}
                                    variant="full"
                                />
                            </View>
                        </View>

                        <Text style={[globalStyles.small, { marginTop: spacing.sm }]}>Player state: {playerState} · Sync: {syncStatus}</Text>
                        {syncStatus === 'autoplay-blocked' ? (
                            <Pressable onPress={togglePlayPause} style={{ marginTop: spacing.sm }}>
                                <Text style={globalStyles.link}>Tap to start synchronized playback</Text>
                            </Pressable>
                        ) : null}

                    </View>
                ) : (
                    <View>
                        <Text style={globalStyles.title}>YouTube Player</Text>
                        <Text style={[globalStyles.secondaryText, { marginTop: spacing.sm, marginBottom: spacing.xl }]}>
                            Start playback from the first track in a playlist.
                        </Text>

                        <View style={[cardStyle, { marginTop: spacing.xl }]}>
                            <Text style={globalStyles.heading}>No video loaded</Text>
                            <Text style={[globalStyles.secondaryText, { marginTop: spacing.sm }]}>
                                The active playlist will load the player when playback begins.
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function extractYouTubeVideoId(value: string): string | null {
    const trimmed = value.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

    try {
        const url = new URL(trimmed);
        if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) {
            return validateVideoId(url.pathname.slice(1));
        }
        if (url.hostname.includes('youtube.com')) {
            const queryId = url.searchParams.get('v');
            if (queryId) return validateVideoId(queryId);
            const pathId = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
            return validateVideoId(pathId);
        }
    } catch {
        return null;
    }

    return null;
}

function validateVideoId(value: string | undefined): string | null {
    return value && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null;
}

const cardStyle = {
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    padding: spacing.lg,
} as const;
