import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { PLAYER_HEADER_HEIGHT } from '../../src/lib/playerPresentation';
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
        <View style={globalStyles.screen}>
            <View style={[styles.header, { height: insets.top + PLAYER_HEADER_HEIGHT, paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} hitSlop={10}>
                    <Text style={globalStyles.link}>Back</Text>
                </Pressable>
                <Text style={globalStyles.title}>Now Playing</Text>
            </View>
            <ScrollView
                contentContainerStyle={{
                    padding: spacing.xl,
                    paddingBottom: insets.bottom + spacing.xxl,
                }}
            >
            {!videoId ? (
                <View style={{ marginTop: spacing.xl, padding: spacing.lg, backgroundColor: colors.bg.card, borderRadius: 8 }}>
                    <Text style={globalStyles.heading}>Nothing is playing</Text>
                    <Text style={[globalStyles.secondaryText, { marginTop: spacing.sm }]}>Start a track from a playlist to use the fullplayer.</Text>
                </View>
            ) : activePlaylistId === null ? (
                <Text style={[globalStyles.small, { color: colors.text.secondary, marginTop: spacing.sm }]}>Playback is synchronizing.</Text>
            ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.xl,
        backgroundColor: colors.bg.base,
        zIndex: 10,
    },
});
