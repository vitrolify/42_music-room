import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    addPlaylistTrack,
    getPlaylist,
    listPlaylistTracks,
    movePlaylistTrack,
    ApiError,
    type Playlist,
    type PlaylistTrack,
} from '../../src/lib/api';
import { colors, globalStyles, spacing } from '../../src/styles';

export default function PlaylistDetail() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const playlistId = Number(id);

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
    const [trackInfoId, setTrackInfoId] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mutating, setMutating] = useState(false);
    const [mutationMessage, setMutationMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!Number.isFinite(playlistId)) return;

        try {
            setError(null);
            const [nextPlaylist, nextTracks] = await Promise.all([
                getPlaylist(playlistId),
                listPlaylistTracks(playlistId),
            ]);
            setPlaylist(nextPlaylist);
            setTracks(nextTracks);
        } catch (err) {
            const message = getPlaylistTrackErrorMessage(err, 'load playlist tracks');
            setError(message);
        }
    }, [playlistId]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        })();
    }, [fetchData]);

    async function handleRefresh() {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }

    async function refreshTracksAfterMutation(
        hasExpectedChange: (nextTracks: PlaylistTrack[]) => boolean,
        unchangedMessage: string,
    ) {
        await sleep(500);

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const nextTracks = await listPlaylistTracks(playlistId);
            setTracks(nextTracks);

            if (hasExpectedChange(nextTracks)) return;

            await sleep(500);
        }

        Alert.alert('Still processing', unchangedMessage);
    }

    async function handleAddTrack() {
        const trimmedTrackInfoId = trackInfoId.trim();
        if (!trimmedTrackInfoId || mutating) return;

        setMutating(true);
        setMutationMessage('Adding track...');
        try {
            const previousTrackCount = tracks.length;
            await addPlaylistTrack(playlistId, trimmedTrackInfoId);
            setTrackInfoId('');
            await refreshTracksAfterMutation(
                nextTracks => nextTracks.length > previousTrackCount,
                'The add request was accepted, but the track has not appeared yet. Refresh and try again if it does not show up.',
            );
        } catch (err) {
            Alert.alert('Error', getPlaylistTrackErrorMessage(err, 'add track'));
        } finally {
            setMutationMessage(null);
            setMutating(false);
        }
    }

    async function handleMoveTrack(track: PlaylistTrack, newPosition: number) {
        if (mutating) return;

        setMutating(true);
        setMutationMessage('Moving track...');
        try {
            await movePlaylistTrack(playlistId, track, newPosition);
            await refreshTracksAfterMutation(
                nextTracks => nextTracks.some(nextTrack => (
                    nextTrack.id === track.id && nextTrack.position === newPosition
                )),
                'The move request was accepted, but the order did not change yet. Refresh and retry if the list stays the same.',
            );
        } catch (err) {
            Alert.alert('Error', getPlaylistTrackErrorMessage(err, 'move track'));
        } finally {
            setMutationMessage(null);
            setMutating(false);
        }
    }

    if (loading) {
        return (
            <View style={[globalStyles.container, { paddingTop: insets.top + spacing.xl }]}>
                <ActivityIndicator size="large" color={colors.brand} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[globalStyles.screen, { paddingTop: insets.top + spacing.xl }]}
            contentContainerStyle={{
                padding: spacing.xl,
                paddingBottom: insets.bottom + spacing.xxl,
            }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.brand}
                />
            }
        >
            <View style={{ marginBottom: spacing.xl }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <Text style={globalStyles.link}>Back</Text>
                    </Pressable>
                    <Pressable
                        onPress={handleRefresh}
                        disabled={refreshing || mutating}
                        style={({ pressed }) => ({
                            opacity: pressed || refreshing || mutating ? 0.55 : 1,
                        })}
                    >
                        <Text style={globalStyles.link}>Refresh</Text>
                    </Pressable>
                </View>
                <Text style={globalStyles.title}>{playlist?.name ?? 'Playlist'}</Text>
                <Text style={[globalStyles.small, { marginTop: spacing.xs }]}>Tracks</Text>
                {mutationMessage ? (
                    <Text style={[globalStyles.small, { color: colors.brand, marginTop: spacing.xs }]}>
                        {mutationMessage}
                    </Text>
                ) : null}
            </View>

            {error ? (
                <View style={cardStyle}>
                    <Text style={globalStyles.errorText}>{error}</Text>
                    <Pressable
                        style={({ pressed }) => ({
                            ...globalStyles.primaryPillButton,
                            opacity: pressed ? 0.8 : 1,
                        })}
                        onPress={fetchData}
                    >
                        <Text style={globalStyles.primaryPillButtonText}>Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <>
                    <View style={[cardStyle, { marginBottom: spacing.xl }]}> 
                        <Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>Add Track</Text>
                        <TextInput
                            style={globalStyles.input}
                            value={trackInfoId}
                            onChangeText={setTrackInfoId}
                            placeholder="Track info id"
                            placeholderTextColor={colors.text.secondary}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Pressable
                            style={({ pressed }) => ({
                                ...globalStyles.primaryPillButton,
                                opacity: pressed || mutating || !trackInfoId.trim() ? 0.7 : 1,
                            })}
                            onPress={handleAddTrack}
                            disabled={mutating || !trackInfoId.trim()}
                        >
                            {mutating ? (
                                <ActivityIndicator size="small" color={colors.text.primary} />
                            ) : (
                                <Text style={globalStyles.primaryPillButtonText}>Add</Text>
                            )}
                        </Pressable>
                    </View>

                    {tracks.length === 0 ? (
                        <View style={cardStyle}>
                            <Text style={[globalStyles.heading, { marginBottom: spacing.sm }]}>No tracks yet</Text>
                            <Text style={globalStyles.secondaryText}>Add a track id to start building this playlist.</Text>
                        </View>
                    ) : (
                        <View style={{ gap: spacing.sm }}>
                            {tracks.map((track, index) => (
                                <TrackRow
                                    key={track.id}
                                    track={track}
                                    isFirst={index === 0}
                                    isLast={index === tracks.length - 1}
                                    disabled={mutating}
                                    onMove={handleMoveTrack}
                                />
                            ))}
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
}

type TrackRowProps = {
    track: PlaylistTrack;
    isFirst: boolean;
    isLast: boolean;
    disabled: boolean;
    onMove: (track: PlaylistTrack, newPosition: number) => void;
};

function TrackRow({ track, isFirst, isLast, disabled, onMove }: TrackRowProps) {
    return (
        <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text style={globalStyles.bodyBold} numberOfLines={1}>
                        {track.position}. {track.track_info_id ?? 'Unknown track'}
                    </Text>
                    <Text style={globalStyles.small}>Status: {track.status}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <MoveButton
                        label="Up"
                        disabled={disabled || isFirst}
                        onPress={() => onMove(track, track.position - 1)}
                    />
                    <MoveButton
                        label="Down"
                        disabled={disabled || isLast}
                        onPress={() => onMove(track, track.position + 1)}
                    />
                </View>
            </View>
        </View>
    );
}

type MoveButtonProps = {
    label: string;
    disabled: boolean;
    onPress: () => void;
};

function MoveButton({ label, disabled, onPress }: MoveButtonProps) {
    return (
        <Pressable
            style={({ pressed }) => ({
                ...globalStyles.pillButton,
                paddingHorizontal: spacing.md,
                opacity: disabled || pressed ? 0.55 : 1,
            })}
            onPress={onPress}
            disabled={disabled}
        >
            <Text style={[globalStyles.pillButtonText, { fontSize: 11 }]}>{label}</Text>
        </Pressable>
    );
}

const cardStyle = {
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    padding: spacing.lg,
} as const;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getPlaylistTrackErrorMessage(error: unknown, action: string) {
    if (error instanceof ApiError) {
        if (error.errorCode === 'PLAYLIST_NOT_FOUND') return 'Playlist not found.';
        if (error.errorCode === 'FORBIDDEN') return 'You do not have permission to edit this playlist.';
        if (error.errorCode === 'AUTH_TOKEN_MISSING') return 'Please sign in again.';
    }

    return error instanceof Error ? error.message : `Failed to ${action}`;
}
