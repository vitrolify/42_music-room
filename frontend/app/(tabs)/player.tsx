import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { colors, globalStyles, spacing } from '../../src/styles';

/**
 * Dedicated player destination. The synchronized YouTube surface is mounted
 * by the tab shell and is visible only while this route is focused; this page
 * supplies the route-level empty state and navigation context.
 */
export default function PlayerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { videoId, activePlaylistId } = usePlayer();

    return (
        <ScrollView
            style={globalStyles.screen}
            contentContainerStyle={{
                paddingTop: insets.top + spacing.xl,
                paddingHorizontal: spacing.xl,
                paddingBottom: insets.bottom + spacing.xxl,
            }}
        >
            <Pressable onPress={() => router.back()}>
                <Text style={globalStyles.link}>Back</Text>
            </Pressable>
            <Text style={[globalStyles.title, { marginTop: spacing.lg }]}>Now Playing</Text>
            {!videoId ? (
                <View style={{ marginTop: spacing.xl, padding: spacing.lg, backgroundColor: colors.bg.card, borderRadius: 8 }}>
                    <Text style={globalStyles.heading}>Nothing is playing</Text>
                    <Text style={[globalStyles.secondaryText, { marginTop: spacing.sm }]}>Start a track from a playlist to use the fullplayer.</Text>
                </View>
            ) : activePlaylistId === null ? (
                <Text style={[globalStyles.small, { color: colors.text.secondary, marginTop: spacing.sm }]}>Playback is synchronizing.</Text>
            ) : null}
        </ScrollView>
    );
}
