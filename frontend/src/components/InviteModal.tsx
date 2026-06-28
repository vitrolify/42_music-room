import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import {
    listInvites,
    createInviteByEmail,
    deleteInvite,
    ApiError,
    type Playlist,
    type Invite,
} from '../lib/api';
import { colors, spacing, globalStyles } from '../styles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
    playlist: Playlist | null;
    visible: boolean;
    onClose: () => void;
    onInviteChanged: () => void;
};

export default function InviteModal({ playlist, visible, onClose, onInviteChanged }: Props) {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!visible || !playlist) return;
        (async () => {
            setLoading(true);
            try {
                const data = await listInvites(playlist.id);
                setInvites(data);
            } catch (err) {
                console.warn('Failed to load invites:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [visible, playlist]);

    async function handleSend() {
        const normalizedEmail = email.trim().toLowerCase();
        if (!playlist || !normalizedEmail) return;
        if (!EMAIL_RE.test(normalizedEmail)) {
            Alert.alert('Invalid email', 'Enter a valid email address.');
            return;
        }

        setSending(true);
        try {
            await createInviteByEmail(playlist.id, normalizedEmail);
            setEmail('');
            await onInviteChanged();
            const data = await listInvites(playlist.id);
            setInvites(data);
        } catch (err) {
            const msg = getInviteErrorMessage(err);
            Alert.alert('Error', msg);
        } finally {
            setSending(false);
        }
    }

    async function handleCancel(inviteId: number) {
        try {
            await deleteInvite(inviteId);
            setInvites(prev => prev.filter(i => i.id !== inviteId));
            await onInviteChanged();
        } catch (err) {
            const msg = getInviteErrorMessage(err, 'cancel');
            Alert.alert('Error', msg);
        }
    }

    const pending = invites.filter(i => i.status === 'pending');
    const accepted = invites.filter(i => i.status === 'accepted');
    const declined = invites.filter(i => i.status === 'declined');

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
                        maxHeight: '80%',
                        padding: spacing.xl,
                    }}
                >
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text style={globalStyles.heading} numberOfLines={1}>
                            {playlist?.name ?? 'Playlist'}
                        </Text>
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

                    <ScrollView>
                        {/* Send Invite */}
                        <View style={{ marginBottom: spacing.xl }}>
                            <Text
                                style={[
                                    globalStyles.captionBold,
                                    { marginBottom: spacing.sm, textTransform: 'uppercase' },
                                ]}
                            >
                                Invite by Email
                            </Text>
                            <TextInput
                                style={globalStyles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="user@email.com"
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
                                    <Text style={globalStyles.primaryPillButtonText}>Send Invite</Text>
                                )}
                            </Pressable>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={colors.brand} />
                        ) : (
                            <>
                                {/* Pending */}
                                {pending.length > 0 && (
                                    <View style={{ marginBottom: spacing.lg }}>
                                        <Text style={[globalStyles.captionBold, { marginBottom: spacing.sm }]}>
                                            Pending ({pending.length})
                                        </Text>
                                        {pending.map(invite => (
                                            <View
                                                key={invite.id}
                                                style={{
                                                    backgroundColor: colors.bg.card,
                                                    borderRadius: 8,
                                                    padding: spacing.md,
                                                    marginBottom: spacing.xs,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <Text
                                                    style={globalStyles.body}
                                                    numberOfLines={1}
                                                >
                                                    {invite.user_id}
                                                </Text>
                                                <Pressable
                                                    style={({ pressed }) => ({
                                                        ...globalStyles.pillButton,
                                                        backgroundColor: colors.semantic.error,
                                                        opacity: pressed ? 0.7 : 1,
                                                        paddingVertical: spacing.xs,
                                                    })}
                                                    onPress={() => handleCancel(invite.id)}
                                                >
                                                    <Text
                                                        style={[
                                                            globalStyles.pillButtonText,
                                                            { fontSize: 11, color: colors.text.primary },
                                                        ]}
                                                    >
                                                        Cancel
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Accepted */}
                                {accepted.length > 0 && (
                                    <View style={{ marginBottom: spacing.lg }}>
                                        <Text style={[globalStyles.captionBold, { marginBottom: spacing.sm }]}>
                                            Accepted ({accepted.length})
                                        </Text>
                                        {accepted.map(invite => (
                                            <View
                                                key={invite.id}
                                                style={{
                                                    backgroundColor: colors.bg.card,
                                                    borderRadius: 8,
                                                    padding: spacing.md,
                                                    marginBottom: spacing.xs,
                                                    opacity: 0.6,
                                                }}
                                            >
                                                <Text style={globalStyles.body} numberOfLines={1}>
                                                    {invite.user_id}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Declined */}
                                {declined.length > 0 && (
                                    <View style={{ marginBottom: spacing.lg }}>
                                        <Text style={[globalStyles.captionBold, { marginBottom: spacing.sm }]}>
                                            Declined ({declined.length})
                                        </Text>
                                        {declined.map(invite => (
                                            <View
                                                key={invite.id}
                                                style={{
                                                    backgroundColor: colors.bg.card,
                                                    borderRadius: 8,
                                                    padding: spacing.md,
                                                    marginBottom: spacing.xs,
                                                    opacity: 0.4,
                                                }}
                                            >
                                                <Text style={globalStyles.body} numberOfLines={1}>
                                                    {invite.user_id}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {invites.length === 0 && (
                                    <Text style={globalStyles.secondaryText}>
                                        No invites yet. Send one above.
                                    </Text>
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function getInviteErrorMessage(error: unknown, action: 'send' | 'cancel' = 'send') {
    if (error instanceof ApiError) {
        if (error.errorCode === 'USER_NOT_FOUND') return 'No user found with that email.';
        if (error.errorCode === 'INVITE_SELF') return "You can't invite yourself.";
        if (error.errorCode === 'INVITE_DUPLICATE') return 'That user has already been invited.';
        if (error.errorCode === 'PLAYLIST_NOT_FOUND') return 'This playlist no longer exists.';
        if (error.errorCode === 'INVITE_NOT_FOUND') return 'This invite no longer exists.';
        if (error.errorCode === 'FORBIDDEN') {
            return action === 'cancel'
                ? 'You cannot cancel this invite.'
                : 'Only the playlist owner can send invites.';
        }
    }
    return error instanceof Error ? error.message : `Failed to ${action} invite`;
}
