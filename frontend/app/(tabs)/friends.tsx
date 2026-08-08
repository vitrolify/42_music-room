import { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    ScrollView,
    ActivityIndicator,
    Modal,
    RefreshControl,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { showAlert } from '../../src/lib/alerts';
import {
    getFriends,
    getIncomingRequests,
    getOutgoingRequests,
    sendFriendRequestByEmail,
    acceptFriendRequest,
    declineFriendRequest,
    ApiError,
    type FriendRequestIncoming,
    type FriendRequestOutgoing,
    type FriendUser,
} from '../../src/lib/api';
import { getAvatarSource } from '../../src/lib/avatars';
import { colors, spacing, globalStyles } from '../../src/styles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Friends() {
    const { user, initializing } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isCompact = width < 560;
    const loadedOnce = useRef(false);

    const [friends, setFriends] = useState<FriendUser[]>([]);
    const [incoming, setIncoming] = useState<FriendRequestIncoming[]>([]);
    const [outgoing, setOutgoing] = useState<FriendRequestOutgoing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [f, inc, out] = await Promise.all([
                getFriends(),
                getIncomingRequests(),
                getOutgoingRequests(),
            ]);
            setFriends(f);
            setIncoming(inc);
            setOutgoing(out);
        } catch (err) {
            console.warn('Failed to fetch friends:', err);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (initializing || !user) return;
            (async () => {
                if (!loadedOnce.current) {
                    loadedOnce.current = true;
                    setLoading(true);
                }
                await fetchData();
                setLoading(false);
            })();
        }, [fetchData, initializing, user]),
    );

    async function handleRefresh() {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }

    async function handleAccept(requestId: number) {
        try {
            await acceptFriendRequest(requestId);
            await fetchData();
        } catch (err) {
            showAlert('Error', getFriendErrorMessage(err, 'accept'));
        }
    }

    async function handleDecline(requestId: number) {
        try {
            await declineFriendRequest(requestId);
            await fetchData();
        } catch (err) {
            showAlert('Error', getFriendErrorMessage(err, 'decline'));
        }
    }

    function openProfile(userId: string, isFriend: boolean) {
        router.push({
            pathname: '/user/[id]',
            params: { id: userId, isFriend: isFriend ? '1' : '0' },
        });
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
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.xl,
                }}
            >
                <Text style={globalStyles.title}>Friends</Text>
                <Pressable
                    style={({ pressed }) => ({
                        ...globalStyles.primaryPillButton,
                        paddingHorizontal: spacing.lg,
                        opacity: pressed ? 0.8 : 1,
                    })}
                    onPress={() => setAddModalVisible(true)}
                >
                    <Text style={globalStyles.primaryPillButtonText}>New</Text>
                </Pressable>
            </View>

            {incoming.length > 0 && (
                <View style={{ marginBottom: spacing.xxl }}>
                    <Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>
                        Friend requests ({incoming.length})
                    </Text>
                    {incoming.map(request => (
                        <Pressable
                            key={request.id}
                            onPress={() => openProfile(request.requester.id, false)}
                            style={({ pressed }) => ({
                                backgroundColor: colors.bg.card,
                                borderRadius: 8,
                                padding: spacing.lg,
                                marginBottom: spacing.sm,
                                flexDirection: isCompact ? 'column' : 'row',
                                alignItems: isCompact ? 'stretch' : 'center',
                                justifyContent: 'space-between',
                                opacity: pressed ? 0.9 : 1,
                            })}
                        >
                            <UserRow user={request.requester} column={isCompact} />
                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: spacing.sm,
                                    flexShrink: 0,
                                    alignSelf: isCompact ? 'flex-end' : 'auto',
                                    marginTop: isCompact ? spacing.md : 0,
                                }}
                            >
                                <Pressable
                                    style={({ pressed }) => ({
                                        ...globalStyles.pillButton,
                                        backgroundColor: colors.brand,
                                        opacity: pressed ? 0.7 : 1,
                                    })}
                                    onPress={() => handleAccept(request.id)}
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
                                    onPress={() => handleDecline(request.id)}
                                >
                                    <Text style={globalStyles.pillButtonText}>Decline</Text>
                                </Pressable>
                            </View>
                        </Pressable>
                    ))}
                </View>
            )}

            {outgoing.length > 0 && (
                <View style={{ marginBottom: spacing.xxl }}>
                    <Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>
                        Sent requests ({outgoing.length})
                    </Text>
                    {outgoing.map(request => (
                        <Pressable
                            key={request.id}
                            onPress={() => openProfile(request.addressee.id, false)}
                            style={({ pressed }) => ({
                                backgroundColor: colors.bg.card,
                                borderRadius: 8,
                                padding: spacing.lg,
                                marginBottom: spacing.sm,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                opacity: pressed ? 0.7 : 0.6,
                            })}
                        >
                            <UserRow user={request.addressee} />
                            <Text style={[globalStyles.small, { flexShrink: 0 }]}>Pending</Text>
                        </Pressable>
                    ))}
                </View>
            )}

            <View style={{ marginBottom: spacing.xxl }}>
                <Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>
                    {friends.length > 0 ? `Friends (${friends.length})` : 'Friends'}
                </Text>
                {friends.length > 0 ? (
                    friends.map(friend => (
                        <Pressable
                            key={friend.id}
                            onPress={() => openProfile(friend.id, true)}
                            style={({ pressed }) => ({
                                backgroundColor: colors.bg.card,
                                borderRadius: 8,
                                padding: spacing.lg,
                                marginBottom: spacing.sm,
                                flexDirection: 'row',
                                alignItems: 'center',
                                opacity: pressed ? 0.9 : 1,
                            })}
                        >
                            <UserRow user={friend} />
                        </Pressable>
                    ))
                ) : (
                    <View
                        style={{
                            backgroundColor: colors.bg.card,
                            borderRadius: 8,
                            padding: spacing.xl,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={[globalStyles.heading, { marginBottom: spacing.sm }]}>
                            No friends yet
                        </Text>
                        <Text
                            style={[
                                globalStyles.secondaryText,
                                { textAlign: 'center', marginBottom: spacing.lg },
                            ]}
                        >
                            Send a friend request by email to start your music circle.
                        </Text>
                        <Pressable
                            style={({ pressed }) => ({
                                ...globalStyles.primaryPillButton,
                                opacity: pressed ? 0.8 : 1,
                            })}
                            onPress={() => setAddModalVisible(true)}
                        >
                            <Text style={globalStyles.primaryPillButtonText}>Add Friend</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            <AddFriendModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onAdded={fetchData}
                friends={friends}
                incoming={incoming}
                outgoing={outgoing}
            />
        </ScrollView>
    );
}

function UserRow({ user, column = false }: { user: FriendUser; column?: boolean }) {
    const primary = user.display_name || user.email || 'Friend';
    const secondary = user.display_name && user.email ? user.email : null;

    return (
        <View
            style={{
                flex: column ? undefined : 1,
                flexDirection: 'row',
                alignItems: 'center',
                width: column ? '100%' : undefined,
                marginRight: column ? 0 : spacing.md,
            }}
        >
            <Image
                source={getAvatarSource(user.avatar)}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: spacing.md,
                }}
            />
            <View style={{ flex: 1 }}>
                <Text style={globalStyles.bodyBold} numberOfLines={1} ellipsizeMode="tail">
                    {primary}
                </Text>
                {secondary && (
                    <Text style={globalStyles.small} numberOfLines={1} ellipsizeMode="middle">
                        {secondary}
                    </Text>
                )}
            </View>
        </View>
    );
}

function AddFriendModal({
    visible,
    onClose,
    onAdded,
    friends,
    incoming,
    outgoing,
}: {
    visible: boolean;
    onClose: () => void;
    onAdded: () => Promise<void>;
    friends: FriendUser[];
    incoming: FriendRequestIncoming[];
    outgoing: FriendRequestOutgoing[];
}) {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);

    async function handleSend() {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) return;
        if (!EMAIL_RE.test(normalizedEmail)) {
            showAlert('Invalid email', 'Enter a valid email address.');
            return;
        }

        const existingFriend = friends.find(
            friend => (friend.email ?? '').toLowerCase() === normalizedEmail
        );
        if (existingFriend) {
            const name = existingFriend.display_name || existingFriend.email;
            showAlert('Already friends', `${name} is already your friend.`);
            return;
        }

        const incomingRequest = incoming.find(
            request => (request.requester.email ?? '').toLowerCase() === normalizedEmail
        );
        if (incomingRequest) {
            showAlert(
                'Request pending',
                'This user has already sent you a friend request.',
                [
                    { text: 'Not now', style: 'cancel' },
                    { text: 'Accept', onPress: () => handleAcceptIncoming(incomingRequest) },
                ],
            );
            return;
        }

        const outgoingRequest = outgoing.find(
            request => (request.addressee.email ?? '').toLowerCase() === normalizedEmail
        );
        if (outgoingRequest) {
            const name = outgoingRequest.addressee.display_name || outgoingRequest.addressee.email;
            showAlert('Request already sent', `You already sent a request to ${name}.`);
            return;
        }

        setSending(true);
        try {
            await sendFriendRequestByEmail(normalizedEmail);
            setEmail('');
            await onAdded();
            onClose();
        } catch (err) {
            showAlert('Error', getFriendErrorMessage(err, 'send'));
        } finally {
            setSending(false);
        }
    }

    async function handleAcceptIncoming(request: FriendRequestIncoming) {
        try {
            await acceptFriendRequest(request.id);
            setEmail('');
            await onAdded();
            onClose();
        } catch (err) {
            showAlert('Error', getFriendErrorMessage(err, 'accept'));
        }
    }

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
                        width: '100%',
                        maxWidth: 600,
                        alignSelf: 'center',
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
                        <Text style={globalStyles.heading}>Add Friend</Text>
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
                        value={email}
                        onChangeText={setEmail}
                        placeholder="friend@email.com"
                        placeholderTextColor={colors.text.secondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <Pressable
                        style={({ pressed }) => ({
                            ...globalStyles.primaryPillButton,
                            opacity: pressed || sending || !email.trim() ? 0.7 : 1,
                        })}
                        onPress={handleSend}
                        disabled={sending || !email.trim()}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={colors.text.primary} />
                        ) : (
                            <Text style={globalStyles.primaryPillButtonText}>Send Request</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

function getFriendErrorMessage(error: unknown, action: 'send' | 'accept' | 'decline') {
    if (error instanceof ApiError) {
        if (error.errorCode === 'USER_NOT_FOUND') return 'No user found with that email.';
        if (error.errorCode === 'FRIEND_SELF') return "You can't add yourself.";
        if (error.errorCode === 'FRIEND_ALREADY_FRIENDS') return 'Already friends with this user.';
        if (error.errorCode === 'FRIEND_DUPLICATE') return 'Friend request already sent.';
        if (error.errorCode === 'FRIEND_INCOMING_PENDING')
            return 'This user has already sent you a request.';
        if (error.errorCode === 'FRIEND_REQUEST_NOT_FOUND') return 'This request no longer exists.';
        if (error.errorCode === 'FRIEND_ALREADY_RESPONDED') return 'This request was already responded to.';
        if (error.errorCode === 'FORBIDDEN') return `You cannot ${action} this request.`;
    }
    return error instanceof Error ? error.message : `Failed to ${action} friend request`;
}