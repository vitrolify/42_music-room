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
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MusicNote, Trash, UserPlus } from 'phosphor-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { usePlayerBarPadding } from '../../src/hooks/usePlayerBarPadding';
import {
    listPlaylists,
    createPlaylist,
    deletePlaylist,
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
    const router = useRouter();
    const { user, initializing } = useAuth();
    const insets = useSafeAreaInsets();
    const playerBarPadding = usePlayerBarPadding();

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [myInvites, setMyInvites] = useState<InviteWithPlaylist[]>([]);
    const [userDbId, setUserDbId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [createName, setCreateName] = useState('');
    const [createPublic, setCreatePublic] = useState(true);
    const [createInvitedOnly, setCreateInvitedOnly] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);

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
        if (initializing || !user) return;

        (async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        })();
    }, [fetchData, initializing, user]);

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
            setCreateModalVisible(false);
            await fetchData();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to create playlist';
            Alert.alert('Error', msg);
        } finally {
            setCreating(false);
        }
    }

    function handleDelete(playlist: Playlist) {
        Alert.alert(
            'Delete playlist?',
            `This will permanently delete "${playlist.name}".`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePlaylist(playlist.id);
                            if (inviteModalPlaylist?.id === playlist.id) {
                                setInviteModalPlaylist(null);
                            }
                            await fetchData();
                        } catch (err) {
                            const msg = err instanceof Error ? err.message : 'Failed to delete playlist';
                            Alert.alert('Error', msg);
                        }
                    },
                },
            ],
        );
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

    function openPlaylist(playlist: Playlist) {
        router.push({
            pathname: '/playlist/[id]',
            params: { id: String(playlist.id) },
        });
    }

    const ownedPlaylists = playlists.filter(p => p.owner_id === userDbId);
    const sharedPlaylists = playlists.filter(p => p.owner_id !== userDbId);
    const pendingInvites = myInvites.filter(i => i.status === 'pending' && i.user_id === userDbId);
    const hasPlaylists = playlists.length > 0;

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
                paddingBottom: insets.bottom + spacing.xxl + playerBarPadding,
            }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.brand}
                />
            }
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.xl,
                }}
            >
                <Text style={globalStyles.title}>Playlists</Text>
                <Pressable
                    style={({ pressed }) => ({
                        ...globalStyles.primaryPillButton,
                        paddingHorizontal: spacing.lg,
                        opacity: pressed ? 0.8 : 1,
                    })}
                    onPress={() => setCreateModalVisible(true)}
                >
                    <Text style={globalStyles.primaryPillButtonText}>New</Text>
                </Pressable>
            </View>

            {pendingInvites.length > 0 && (
                <View style={{ marginBottom: spacing.xxl }}>
                    <Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>Invitations ({pendingInvites.length})</Text>
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
                                <Text style={globalStyles.small} numberOfLines={1}>
                                    From {formatInviteOwner(invite)}
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

            {!hasPlaylists && (
                <View
                    style={{
                        backgroundColor: colors.bg.card,
                        borderRadius: 8,
                        padding: spacing.xl,
                        marginBottom: spacing.xxl,
                        alignItems: 'center',
                    }}
                >
                    <Text style={[globalStyles.heading, { marginBottom: spacing.sm }]}>No playlists yet</Text>
                    <Text
                        style={[
                            globalStyles.secondaryText,
                            { textAlign: 'center', marginBottom: spacing.lg },
                        ]}
                    >
                        Create your first playlist or accept an invite to see shared playlists here.
                    </Text>
                    <Pressable
                        style={({ pressed }) => ({
                            ...globalStyles.primaryPillButton,
                            opacity: pressed ? 0.8 : 1,
                        })}
                        onPress={() => setCreateModalVisible(true)}
                    >
                        <Text style={globalStyles.primaryPillButtonText}>Create Playlist</Text>
                    </Pressable>
                </View>
            )}

            {/* My Playlists */}
            {ownedPlaylists.length > 0 && (
                <View style={{ marginBottom: spacing.xxl }}>
                    <Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>My Playlists ({ownedPlaylists.length})</Text>
                    {ownedPlaylists.map(playlist => (
                        <Pressable
                            key={playlist.id}
                            style={({ pressed }) => ({
                                backgroundColor: colors.bg.card,
                                borderRadius: 8,
                                padding: spacing.lg,
                                marginBottom: spacing.sm,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                opacity: pressed ? 0.85 : 1,
                            })}
                            onPress={() => openPlaylist(playlist)}
                        >
                            <PlaylistArtwork />
                            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                                <View>
                                    <Text style={globalStyles.bodyBold}>{playlist.name}</Text>
                                    <Text style={globalStyles.small}>
                                        {playlist.public ? 'Public' : 'Private'}
                                        {playlist.invited_only_edit ? ' · Invite-only edit' : ''}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                <Pressable
                                    style={({ pressed }) => ({
                                        ...iconButtonStyle,
                                        opacity: pressed ? 0.7 : 1,
                                    })}
                                    onPress={event => {
                                        event.stopPropagation();
                                        setInviteModalPlaylist(playlist);
                                    }}
                                >
                                    <UserPlus weight="bold" size={18} color={colors.text.primary} />
                                </Pressable>
                                <Pressable
                                    style={({ pressed }) => ({
                                        ...iconButtonStyle,
                                        backgroundColor: colors.semantic.error,
                                        opacity: pressed ? 0.7 : 1,
                                    })}
                                    onPress={event => {
                                        event.stopPropagation();
                                        handleDelete(playlist);
                                    }}
                                >
                                    <Trash weight="bold" size={18} color={colors.text.primary} />
                                </Pressable>
                            </View>
                        </Pressable>
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
                        <Pressable
                            key={playlist.id}
                            style={({ pressed }) => ({
                                backgroundColor: colors.bg.card,
                                borderRadius: 8,
                                padding: spacing.lg,
                                marginBottom: spacing.sm,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                opacity: pressed ? 0.85 : 1,
                            })}
                            onPress={() => openPlaylist(playlist)}
                        >
                            <PlaylistArtwork />
                            <View style={{ flex: 1, marginLeft: spacing.md }}>
                                <Text style={globalStyles.bodyBold}>{playlist.name}</Text>
                                <Text style={globalStyles.small}>
                                    {playlist.public ? 'Public' : 'Private'}
                                    {playlist.invited_only_edit ? ' · Invite-only edit' : ''}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            )}

            <InviteModal
                playlist={inviteModalPlaylist}
                visible={inviteModalPlaylist !== null}
                onClose={() => setInviteModalPlaylist(null)}
                onInviteChanged={fetchData}
            />

            <CreatePlaylistModal
                visible={createModalVisible}
                name={createName}
                isPublic={createPublic}
                invitedOnly={createInvitedOnly}
                creating={creating}
                onChangeName={setCreateName}
                onChangePublic={setCreatePublic}
                onChangeInvitedOnly={setCreateInvitedOnly}
                onCreate={handleCreate}
                onClose={() => setCreateModalVisible(false)}
            />
        </ScrollView>
    );
}

type CreatePlaylistModalProps = {
    visible: boolean;
    name: string;
    isPublic: boolean;
    invitedOnly: boolean;
    creating: boolean;
    onChangeName: (name: string) => void;
    onChangePublic: (value: boolean) => void;
    onChangeInvitedOnly: (value: boolean) => void;
    onCreate: () => void;
    onClose: () => void;
};

function CreatePlaylistModal({
    visible,
    name,
    isPublic,
    invitedOnly,
    creating,
    onChangeName,
    onChangePublic,
    onChangeInvitedOnly,
    onCreate,
    onClose,
}: CreatePlaylistModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.overlay,
                    justifyContent: 'center',
                    padding: spacing.xl,
                }}
            >
                <View
                    style={{
                        backgroundColor: colors.bg.elevated,
                        borderRadius: 12,
                        padding: spacing.xl,
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text style={globalStyles.heading}>Create Playlist</Text>
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => ({
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: pressed ? colors.bg.card : 'transparent',
                            })}
                        >
                            <Text style={{ fontSize: 18, color: colors.text.secondary }}>✕</Text>
                        </Pressable>
                    </View>

                    <TextInput
                        style={globalStyles.input}
                        value={name}
                        onChangeText={onChangeName}
                        placeholder="Playlist name"
                        placeholderTextColor={colors.text.secondary}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Switch
                            value={isPublic}
                            onValueChange={onChangePublic}
                            trackColor={{ false: colors.bg.card, true: colors.brand }}
                            thumbColor={colors.text.primary}
                        />
                        <Text style={[globalStyles.body, { marginLeft: spacing.sm }]}>Public</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                        <Switch
                            value={invitedOnly}
                            onValueChange={onChangeInvitedOnly}
                            trackColor={{ false: colors.bg.card, true: colors.brand }}
                            thumbColor={colors.text.primary}
                        />
                        <Text style={[globalStyles.body, { marginLeft: spacing.sm }]}>Invited only edit</Text>
                    </View>
                    <Pressable
                        style={({ pressed }) => ({
                            ...globalStyles.primaryPillButton,
                            opacity: pressed || creating || !name.trim() ? 0.7 : 1,
                        })}
                        onPress={onCreate}
                        disabled={creating || !name.trim()}
                    >
                        {creating ? (
                            <ActivityIndicator size="small" color={colors.text.primary} />
                        ) : (
                            <Text style={globalStyles.primaryPillButtonText}>Create</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
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

function PlaylistArtwork() {
    return (
        <View
            style={{
                width: 48,
                height: 48,
                borderRadius: 6,
                backgroundColor: colors.bg.alternate,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <MusicNote weight="bold" size={24} color={colors.text.secondary} />
        </View>
    );
}

const iconButtonStyle = {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
} as const;

function formatInviteOwner(invite: InviteWithPlaylist) {
    return invite.owner.display_name || invite.owner.email || 'playlist owner';
}
