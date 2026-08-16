import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YouTubePlayer from '../src/components/YouTubePlayer';
import type { YouTubePlayerHandle, YouTubePlayerProgress, YouTubePlayerState } from '../src/components/YouTubePlayer.types';
import { colors, globalStyles, spacing } from '../src/styles';

export default function PlayerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [input, setInput] = useState('');
    const [videoId, setVideoId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const playerRef = useRef<YouTubePlayerHandle>(null);
    const [playerState, setPlayerState] = useState<YouTubePlayerState>('unstarted');
    const [playerReady, setPlayerReady] = useState(false);
    const [progress, setProgress] = useState<YouTubePlayerProgress>({ currentTime: 0, duration: 0 });

    function loadVideo() {
        const nextVideoId = extractYouTubeVideoId(input);
        if (!nextVideoId) {
            setVideoId(null);
            setError('Enter a valid YouTube video ID or URL.');
            return;
        }

        setError(null);
        setPlayerReady(false);
        setPlayerState('unstarted');
        setProgress({ currentTime: 0, duration: 0 });
        setVideoId(nextVideoId);
    }

    function handlePlayerError(message: string) {
        setError(message);
        Alert.alert('Player error', message);
    }

    return (
        <ScrollView
            style={[globalStyles.screen, { paddingTop: insets.top + spacing.xl }]}
            contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }}
            keyboardShouldPersistTaps="handled"
        >
            <Pressable onPress={() => router.back()} style={{ marginBottom: spacing.xl }}>
                <Text style={globalStyles.link}>Back</Text>
            </Pressable>

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

            {videoId ? (
                <View style={{ marginTop: spacing.xl }}>
                    <YouTubePlayer
                        ref={playerRef}
                        videoId={videoId}
                        onReady={() => setPlayerReady(true)}
                        onStateChange={setPlayerState}
                        onProgress={setProgress}
                        onError={handlePlayerError}
                    />
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                        <Pressable
                            style={({ pressed }) => ({ ...globalStyles.primaryPillButton, opacity: !playerReady || pressed ? 0.55 : 1 })}
                            onPress={() => playerRef.current?.play()}
                            disabled={!playerReady}
                        >
                            <Text style={globalStyles.primaryPillButtonText}>Play</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => ({ ...globalStyles.pillButton, opacity: !playerReady || pressed ? 0.55 : 1 })}
                            onPress={() => playerRef.current?.pause()}
                            disabled={!playerReady}
                        >
                            <Text style={globalStyles.pillButtonText}>Pause</Text>
                        </Pressable>
                    </View>
                    <Text style={[globalStyles.small, { marginTop: spacing.sm }]}>Player state: {playerState}</Text>
                    <ProgressBar
                        currentTime={progress.currentTime}
                        duration={progress.duration}
                        onSeek={seconds => playerRef.current?.seekTo(seconds)}
                    />
                    <Text style={[globalStyles.small, { marginTop: spacing.sm }]}>Video ID: {videoId}</Text>
                </View>
            ) : (
                <View style={[cardStyle, { marginTop: spacing.xl }]}>
                    <Text style={globalStyles.heading}>No video loaded</Text>
                    <Text style={[globalStyles.secondaryText, { marginTop: spacing.sm }]}>
                        Paste a YouTube link or an 11-character video ID to begin.
                    </Text>
                </View>
            )}
        </ScrollView>
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
    useEffect(() => {
        if (draftTime !== null && Math.abs(currentTime - draftTime) < 2) {
            setDraftTime(null);
        }
    }, [currentTime, draftTime]);

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
        <View style={{ marginTop: spacing.lg }}>
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
