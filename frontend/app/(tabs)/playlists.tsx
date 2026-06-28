import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
    Switch,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    listPlaylists,
    createPlaylist,
    getMyProfile,
    getMyInvites,
    acceptInvite,
    declineInvite,
    ApiError,
    type Playlist,
    type InviteWithPlaylist,
} from '../../src/lib/api';
import { colors, spacing, globalStyles } from '../../src/styles';
import InviteModal from '../../src/components/InviteModal';

export default function Playlists() {
    const insets = useSafeAreaInsets();

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [myInvites, setMyInvites] = useState<InviteWithPlaylist[]>([]);
    const [userDbId, setUserDbId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [createName, setCreateName] = useState('');
    const [createPublic, setCreatePublic] = useState(true);
    const [createInvitedOnly, setCreateInvitedOnly] = useState(false);
    const [creating, setCreating] = useState(false);

    const [inviteModalPlaylist, setInviteModalPlaylist] = useState<Playlist | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [profile, p, i] = await Promise.all([
                getMyProfile(),
                listPlaylists(),
                getMyInvites(),
            ]);
            setUserDbId(profile.id);
            setPlaylists(p);
            setMyInvites(i);
        } catch (err) {
            console.warn('Failed to fetch data:', err);
        }
    }, []);

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

    async function handleCreate() {
        if (!createName.trim()) return;
        setCreating(true);
        try {
            await createPlaylist({
                name: createName.trim(),
                public: createPublic,
                invited_only_edit: createInvitedOnly,
            });
            setCreateName('');
            setCreatePublic(true);
            setCreateInvitedOnly(false);
            await fetchData();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to create playlist';
            Alert.alert('Error', msg);
        } finally {
            setCreating(false);
        }
    }

    async function handleAccept(inviteId: number) {
        try {
            await acceptInvite(inviteId);
            await fetchData();
        } catch (err) {
            const msg = getInviteActionErrorMessage(err, 'accept');
            Alert.alert('Error', msg);
        }
    }

    async function handleDecline(inviteId: number) {
        try {
            await declineInvite(inviteId);
            await fetchData();
        } catch (err) {
            const msg = getInviteActionErrorMessage(err, 'decline');
            Alert.alert('Error', msg);
        }
    }

    const ownedPlaylists = playlists.filter(p => p.owner_id === userDbId);
    const sharedPlaylists = playlists.filter(p => p.owner_id !== userDbId);
    const pendingInvites = myInvites.filter(i => i.status === 'pending' && i.user_id === userDbId);

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
            <Text style={[globalStyles.title, { marginBottom: spacing.xl }]}>Playlists</Text>

            {/* Create Playlist */}
            <View
                style={{
                    backgroundColor: colors.bg.card,
                    borderRadius: 8,
                    padding: spacing.lg,
                    marginBottom: spacing.xxl,
                }}
            >
                <Text
                    style={[
                        globalStyles.captionBold,
                        { marginBottom: spacing.md, textTransform: 'uppercase' },
                    ]}
                >
                    Create New Playlist
                </Text>
                <TextInput
                    style={globalStyles.input}
                    value={createName}
                    onChangeText={setCreateName}
                    placeholder="Playlist name"
                    placeholderTextColor={colors.text.secondary}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    <Switch
                        value={createPublic}
                        onValueChange={setCreatePublic}
                        trackColor={{ false: colors.bg.elevated, true: colors.brand }}
                        thumbColor={colors.text.primary}
                    />
                    <Text style={[globalStyles.body, { marginLeft: spacing.sm }]}>Public</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                    <Switch
                        value={createInvitedOnly}
                        onValueChange={setCreateInvitedOnly}
                        trackColor={{ false: colors.bg.elevated, true: colors.brand }}
                        thumbColor={colors.text.primary}
                    />
                    <Text style={[globalStyles.body, { marginLeft: spacing.sm }]}>Invited only edit</Text>
                </View>
                <Pressable
                    style={({ pressed }) => ({
                        ...globalStyles.primaryPillButton,
                        opacity: pressed || creating || !createName.trim() ? 0.7 : 1,
                    })}
                    onPress={handleCreate}
                    disabled={creating || !createName.trim()}
                >
                    {creating ? (
                        <ActivityIndicator size="small" color={colors.text.primary} />
                    ) : (
                        <Text style={globalStyles.primaryPillButtonText}>Create</Text>
                    )}
                </Pressable>
            </View>

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
                <View style={{ marginBottom: spacing.xxl }}>
                    <Text
                        style={[
                            globalStyles.heading,
                            { marginBottom: spacing.md, color: colors.semantic.info },
                        ]}
                    >
                        Pending Invites ({pendingInvites.length})
                    </Text>
                    {pendingInvites.map(invite => (
                            <View
                                key={invite.id}
                                style={{
                                    backgroundColor: colors.bg.card,
                                    borderRadius: 8,
                                    padding: spacing.lg,
                                    marginBottom: spacing.sm,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <View style={{ flex: 1, marginRight: spacing.md }}>
                                    <Text style={globalStyles.bodyBold}>
                                        {invite.playlist.name}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    <Pressable
                                        style={({ pressed }) => ({
                                            ...globalStyles.pillButton,
                                            backgroundColor: colors.brand,
                                            opacity: pressed ? 0.7 : 1,
                                        })}
                                        onPress={() => handleAccept(invite.id)}
                                    >
                                        <Text
                                            style={[
                                                globalStyles.pillButtonText,
                                                { color: colors.text.primary },
                                            ]}
                                        >
                                            Accept
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={({ pressed }) => ({
                                            ...globalStyles.pillButton,
                                            opacity: pressed ? 0.7 : 1,
                                        })}
                                        onPress={() => handleDecline(invite.id)}
                                    >
                                        <Text style={globalStyles.pillButtonText}>Decline</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                </View>
            )}

            {/* My Playlists */}
            <Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>
                My Playlists ({ownedPlaylists.length})
            </Text>
            {ownedPlaylists.length === 0 ? (
                <Text style={[globalStyles.secondaryText, { marginBottom: spacing.xxl }]}>
                    No playlists yet. Create one above.
                </Text>
            ) : (
                <View style={{ marginBottom: spacing.xxl }}>
                    {ownedPlaylists.map(playlist => (
                        <View
                            key={playlist.id}
                            style={{
                                backgroundColor: colors.bg.card,
                                borderRadius: 8,
                                padding: spacing.lg,
                                marginBottom: spacing.sm,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <View style={{ flex: 1, marginRight: spacing.md }}>
                                <Text style={globalStyles.bodyBold}>{playlist.name}</Text>
                                <Text style={globalStyles.small}>
                                    {playlist.public ? 'Public' : 'Private'}
                                    {playlist.invited_only_edit ? ' · Invite-only edit' : ''}
                                </Text>
                            </View>
                            <Pressable
                                style={({ pressed }) => ({
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: pressed ? colors.bg.elevated : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                })}
                                onPress={() => setInviteModalPlaylist(playlist)}
                            >
                                <Text style={{ fontSize: 20, color: colors.text.secondary }}>⚙</Text>
                            </Pressable>
                        </View>
                    ))}
                </View>
            )}

            {/* Shared with Me */}
            {sharedPlaylists.length > 0 && (
                <View style={{ marginBottom: spacing.xxl }}>
                    <Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>
                        Shared with Me ({sharedPlaylists.length})
                    </Text>
                    {sharedPlaylists.map(playlist => (
                        <View
                            key={playlist.id}
                            style={{
                                backgroundColor: colors.bg.card,
                                borderRadius: 8,
                                padding: spacing.lg,
                                marginBottom: spacing.sm,
                            }}
                        >
                            <Text style={globalStyles.bodyBold}>{playlist.name}</Text>
                            <Text style={globalStyles.small}>
                                {playlist.public ? 'Public' : 'Private'}
                                {playlist.invited_only_edit ? ' · Invite-only edit' : ''}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <InviteModal
                playlist={inviteModalPlaylist}
                visible={inviteModalPlaylist !== null}
                onClose={() => setInviteModalPlaylist(null)}
                onInviteChanged={fetchData}
            />
        </ScrollView>
    );
}

function getInviteActionErrorMessage(error: unknown, action: 'accept' | 'decline') {
    if (error instanceof ApiError) {
        if (error.errorCode === 'INVITE_ALREADY_RESPONDED') return 'This invite was already responded to.';
        if (error.errorCode === 'INVITE_NOT_FOUND') return 'This invite no longer exists.';
        if (error.errorCode === 'FORBIDDEN') return `You cannot ${action} this invite.`;
    }
    return error instanceof Error ? error.message : `Failed to ${action} invite`;
}
