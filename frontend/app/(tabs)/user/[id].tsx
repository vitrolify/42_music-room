import { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    getPublicProfile,
    deleteFriend,
    ApiError,
    type PublicProfile,
} from '../../../src/lib/api';
import { getAvatarSource } from '../../../src/lib/avatars';
import { colors, spacing, globalStyles } from '../../../src/styles';

export default function UserProfile() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id, isFriend } = useLocalSearchParams<{ id: string; isFriend?: string }>();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const p = await getPublicProfile(id);
                setProfile(p);
            } catch (err) {
                Alert.alert('Error', getProfileErrorMessage(err));
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    function confirmRemove() {
        Alert.alert(
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
        setRemoving(true);
        try {
            await deleteFriend(id);
            router.back();
        } catch (err) {
            Alert.alert('Error', getProfileErrorMessage(err));
        } finally {
            setRemoving(false);
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
                    {isFriend === '1' && (
                        <Pressable
                            style={({ pressed }) => ({
                                ...globalStyles.pillButton,
                                backgroundColor: colors.semantic.error,
                                marginTop: spacing.xxl,
                                opacity: pressed || removing ? 0.7 : 1,
                            })}
                            onPress={confirmRemove}
                            disabled={removing}
                        >
                            {removing ? (
                                <ActivityIndicator size="small" color={colors.text.primary} />
                            ) : (
                                <Text style={globalStyles.pillButtonText}>Remove friend</Text>
                            )}
                        </Pressable>
                    )}
                </>
            ) : (
                <Text style={globalStyles.secondaryText}>User not found.</Text>
            )}
        </ScrollView>
    );
}

function getProfileErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
        if (error.errorCode === 'USER_NOT_FOUND') return 'This user does not exist.';
        if (error.errorCode === 'FRIEND_NOT_FOUND')
            return 'You are no longer friends with this user.';
        if (error.errorCode === 'FORBIDDEN') return 'You cannot remove this friend.';
    }
    return error instanceof Error ? error.message : 'Request failed';
}