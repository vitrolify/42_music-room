import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { PLAYER_HEADER_HEIGHT } from '../../src/lib/playerPresentation';
import { colors, globalStyles, spacing } from '../../src/styles';
import PlayerDelegationCard from '../../src/components/PlayerDelegationCard';

/**
 * Dedicated player destination. The synchronized YouTube surface is mounted
 * by the tab shell and is visible only while this route is focused; this page
 * supplies the route-level empty state and navigation context.
 */
export default function PlayerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { videoId, activePlaylistId, playerHostHeight, sessions, selectedSessionOwnerId, selectSession } = usePlayer();

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
                    paddingTop: Math.max(spacing.xl, playerHostHeight + spacing.md),
                    paddingBottom: insets.bottom + spacing.xxl,
                }}
            >
            {!videoId ? (
                <View style={{ marginTop: spacing.xl, padding: spacing.lg, backgroundColor: colors.bg.card, borderRadius: 8 }}>
                    <Text style={globalStyles.heading}>Nothing is playing</Text>
                    <Text style={[globalStyles.secondaryText, { marginTop: spacing.sm }]}>There is no playback on this device.</Text>
                    {sessions.filter(session => session.shared).map(session => (
                        <Pressable
                            key={session.session_id}
                            onPress={() => void selectSession(session.owner_id)}
                            style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: 8, backgroundColor: colors.bg.elevated }}
                        >
                            <Text style={globalStyles.bodyBold}>{session.owner_name ?? 'Shared playback'}</Text>
                            <Text style={[globalStyles.small, { marginTop: spacing.xs }]}>Playing on {session.controller_device_name ?? 'shared device'}</Text>
                            <Text style={[globalStyles.link, { marginTop: spacing.sm }]}>{selectedSessionOwnerId === session.owner_id ? 'Connecting…' : 'Join shared playback'}</Text>
                        </Pressable>
                    ))}
                </View>
            ) : activePlaylistId === null ? (
                <Text style={[globalStyles.small, { color: colors.text.secondary, marginTop: spacing.sm }]}>Playback is synchronizing.</Text>
            ) : <PlayerDelegationCard />}
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
