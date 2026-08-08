import { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    Pressable,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../../../src/lib/alerts';
import {
    getPublicProfile,
    deleteFriend,
    sendFriendRequestToUser,
    acceptFriendRequest,
    ApiError,
    type PublicProfile,
} from '../../../src/lib/api';
import { getAvatarSource } from '../../../src/lib/avatars';
import { colors, spacing, globalStyles } from '../../../src/styles';

export default function UserProfile() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            await refresh();
            setLoading(false);
        })();
    }, [id]);

    async function refresh() {
        try {
            const p = await getPublicProfile(id);
            setProfile(p);
        } catch (err) {
            showAlert('Error', getProfileErrorMessage(err));
        }
    }

    function confirmRemove() {
        showAlert(
            'Remove friend?',
            `This will remove ${profile?.display_name ?? 'this user'} from your friends.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: handleRemove },
            ],
        );
    }

    async function handleRemove() {
        if (!id) return;
        setActing(true);
        try {
            await deleteFriend(id);
            router.back();
        } catch (err) {
            showAlert('Error', getProfileErrorMessage(err));
        } finally {
            setActing(false);
        }
    }

    async function handleAddFriend() {
        if (!id) return;
        setActing(true);
        try {
            await sendFriendRequestToUser(id);
            await refresh();
        } catch (err) {
            showAlert('Error', getProfileErrorMessage(err));
        } finally {
            setActing(false);
        }
    }

    async function handleAcceptRequest() {
        if (!profile?.request_id) return;
        setActing(true);
        try {
            await acceptFriendRequest(profile.request_id);
            await refresh();
        } catch (err) {
            showAlert('Error', getProfileErrorMessage(err));
        } finally {
            setActing(false);
        }
    }

    return (
        <ScrollView
            style={[globalStyles.screen, { paddingTop: insets.top + spacing.xl }]}
            contentContainerStyle={{
                padding: spacing.xl,
                paddingBottom: insets.bottom + spacing.xxl,
                alignItems: 'center',
            }}
        >
            <View style={{ width: '100%', marginBottom: spacing.xxl }}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                    <Text style={globalStyles.link}>Back</Text>
                </Pressable>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.brand} />
            ) : profile ? (
                <>
                    <Image
                        source={getAvatarSource(profile.avatar)}
                        style={{
                            width: 100,
                            height: 100,
                            borderRadius: 50,
                            marginBottom: spacing.lg,
                        }}
                    />
                    <Text style={globalStyles.title}>
                        {profile.display_name || profile.id}
                    </Text>
                    {!profile.is_self && <ActionButton profile={profile} acting={acting} />}
                </>
            ) : (
                <Text style={globalStyles.secondaryText}>User not found.</Text>
            )}
        </ScrollView>
    );

    function ActionButton({
        profile: p,
        acting,
    }: {
        profile: PublicProfile;
        acting: boolean;
    }) {
        if (p.is_friend) {
            return (
                <Pressable
                    style={({ pressed }) => ({
                        ...globalStyles.pillButton,
                        backgroundColor: colors.semantic.error,
                        marginTop: spacing.xxl,
                        opacity: pressed || acting ? 0.7 : 1,
                    })}
                    onPress={confirmRemove}
                    disabled={acting}
                >
                    {acting ? (
                        <ActivityIndicator size="small" color={colors.text.primary} />
                    ) : (
                        <Text style={globalStyles.pillButtonText}>Remove friend</Text>
                    )}
                </Pressable>
            );
        }

        if (p.incoming_request_pending) {
            return (
                <Pressable
                    style={({ pressed }) => ({
                        ...globalStyles.primaryPillButton,
                        marginTop: spacing.xxl,
                        opacity: pressed || acting ? 0.7 : 1,
                    })}
                    onPress={handleAcceptRequest}
                    disabled={acting}
                >
                    {acting ? (
                        <ActivityIndicator size="small" color={colors.text.primary} />
                    ) : (
                        <Text style={globalStyles.primaryPillButtonText}>Accept request</Text>
                    )}
                </Pressable>
            );
        }

        if (p.outgoing_request_pending) {
            return (
                <Pressable
                    style={({ pressed }) => ({
                        ...globalStyles.pillButton,
                        marginTop: spacing.xxl,
                        opacity: pressed ? 0.7 : 0.6,
                    })}
                    disabled
                >
                    <Text style={globalStyles.pillButtonText}>Request sent</Text>
                </Pressable>
            );
        }

        return (
            <Pressable
                style={({ pressed }) => ({
                    ...globalStyles.primaryPillButton,
                    marginTop: spacing.xxl,
                    opacity: pressed || acting ? 0.7 : 1,
                })}
                onPress={handleAddFriend}
                disabled={acting}
            >
                {acting ? (
                    <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                    <Text style={globalStyles.primaryPillButtonText}>Add friend</Text>
                )}
            </Pressable>
        );
    }
}

function getProfileErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
        if (error.errorCode === 'USER_NOT_FOUND') return 'This user does not exist.';
        if (error.errorCode === 'FRIEND_NOT_FOUND')
            return 'You are no longer friends with this user.';
        if (error.errorCode === 'FRIEND_ALREADY_FRIENDS')
            return 'Already friends with this user.';
        if (error.errorCode === 'FRIEND_INCOMING_PENDING')
            return 'This user has already sent you a request.';
        if (error.errorCode === 'FRIEND_DUPLICATE') return 'Friend request already sent.';
        if (error.errorCode === 'FRIEND_SELF') return "You can't add yourself.";
        if (error.errorCode === 'FORBIDDEN') return 'You cannot perform this action.';
    }
    return error instanceof Error ? error.message : 'Request failed';
}