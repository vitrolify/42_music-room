import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YouTubePlayer from '../src/components/YouTubePlayer';
import type { YouTubePlayerHandle, YouTubePlayerState } from '../src/components/YouTubePlayer.types';
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
