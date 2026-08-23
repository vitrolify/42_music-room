import { useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause } from 'phosphor-react-native';
import YouTubePlayer from './YouTubePlayer';
import { usePlayer } from '../contexts/PlayerContext';
import { colors, globalStyles, spacing } from '../styles';

export default function PlayerOverlay() {
    const insets = useSafeAreaInsets();
    const [input, setInput] = useState('');
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
        loadVideo: contextLoadVideo,
        togglePlayPause,
        setPlayerReady,
        setPlayerState,
        setProgress,
        setShowPlayer,
        seekTo,
    } = usePlayer();

    function loadVideo() {
        const nextVideoId = extractYouTubeVideoId(input);
        if (!nextVideoId) {
            setError('Enter a valid YouTube video ID or URL.');
            return;
        }
        setError(null);
        contextLoadVideo(nextVideoId);
    }

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
                ...(Platform.OS === 'web'
                    ? { pointerEvents: (showPlayer ? 'auto' : 'none') as any }
                    : { pointerEvents: (showPlayer ? 'auto' : 'none') as any }),
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
                                />
                            </View>
                        </View>

                        <Text style={[globalStyles.small, { marginTop: spacing.sm }]}>Player state: {playerState}</Text>

                        <View style={[cardStyle, { marginTop: spacing.xl }]}>
                            <Text style={globalStyles.heading}>Load a new video</Text>
                            <TextInput
                                style={[globalStyles.input, { marginTop: spacing.sm }]}
                                value={input}
                                onChangeText={setInput}
                                placeholder="YouTube ID or URL"
                                placeholderTextColor={colors.text.secondary}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onSubmitEditing={loadVideo}
                            />
                            <Pressable
                                style={({ pressed }) => ({ ...globalStyles.primaryPillButton, opacity: pressed ? 0.8 : 1, marginTop: spacing.sm })}
                                onPress={loadVideo}
                            >
                                <Text style={globalStyles.primaryPillButtonText}>Load video</Text>
                            </Pressable>
                            {error ? <Text style={[globalStyles.errorText, { marginTop: spacing.sm }]}>{error}</Text> : null}
                        </View>
                    </View>
                ) : (
                    <View>
                        <Text style={globalStyles.title}>YouTube Player</Text>
                        <Text style={[globalStyles.secondaryText, { marginTop: spacing.sm, marginBottom: spacing.xl }]}>
                            Test a video before connecting playback to a playlist.
                        </Text>

                        <TextInput
                            style={globalStyles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="YouTube ID or URL"
                            placeholderTextColor={colors.text.secondary}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onSubmitEditing={loadVideo}
                        />
                        <Pressable
                            style={({ pressed }) => ({ ...globalStyles.primaryPillButton, opacity: pressed ? 0.8 : 1 })}
                            onPress={loadVideo}
                        >
                            <Text style={globalStyles.primaryPillButtonText}>Load video</Text>
                        </Pressable>

                        {error ? <Text style={[globalStyles.errorText, { marginTop: spacing.lg }]}>{error}</Text> : null}

                        <View style={[cardStyle, { marginTop: spacing.xl }]}>
                            <Text style={globalStyles.heading}>No video loaded</Text>
                            <Text style={[globalStyles.secondaryText, { marginTop: spacing.sm }]}>
                                Paste a YouTube link or an 11-character video ID to begin.
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

type ProgressBarProps = {
    currentTime: number;
    duration: number;
    onSeek: (seconds: number) => void;
};

function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
    const widthRef = useRef(0);
    const leftRef = useRef(0);
    const barRef = useRef<any>(null);
    const [draftTime, setDraftTime] = useState<number | null>(null);
    const shownTime = draftTime ?? currentTime;
    const ratio = duration > 0 ? Math.min(Math.max(shownTime / duration, 0), 1) : 0;

    const seekFromX = (x: number) => {
        if (!Number.isFinite(x) || widthRef.current <= 0 || duration <= 0) return;
        const seconds = Math.round((Math.min(Math.max(x, 0), widthRef.current) / widthRef.current) * duration);
        setDraftTime(seconds);
        return seconds;
    };
    const eventX = (event: { nativeEvent: { locationX?: number; pageX?: number; clientX?: number } }) => {
        const { locationX, pageX, clientX } = event.nativeEvent;
        const rect = barRef.current?.getBoundingClientRect?.();
        if (rect && typeof clientX === 'number' && Number.isFinite(clientX)) return clientX - rect.left;
        if (typeof locationX === 'number' && Number.isFinite(locationX)) return locationX;
        if (typeof pageX === 'number' && Number.isFinite(pageX)) return pageX - leftRef.current;
        return 0;
    };

    return (
        <View>
            <Pressable
                ref={barRef}
                onPress={event => {
                    const seconds = seekFromX(eventX(event));
                    if (seconds !== undefined) onSeek(seconds);
                }}
                onLayout={event => {
                    widthRef.current = event.nativeEvent.layout.width;
                    event.currentTarget?.measureInWindow?.(x => { leftRef.current = x; });
                }}
                style={{ height: 28, justifyContent: 'center' }}
            >
                <View style={{ height: 5, borderRadius: 5, backgroundColor: colors.bg.elevated }}>
                    <View style={{ width: `${ratio * 100}%`, height: 5, borderRadius: 5, backgroundColor: colors.brand }} />
                </View>
                <View style={{ position: 'absolute', left: `${ratio * 100}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand }} />
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
                <Text style={globalStyles.small}>{formatTime(currentTime)}</Text>
                <Text style={globalStyles.small}>{duration > 0 ? formatTime(duration) : '--:--'}</Text>
            </View>
        </View>
    );
}

function formatTime(seconds: number) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
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
