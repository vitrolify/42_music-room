import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { getMyProfile, updateMyProfile } from '../../src/lib/api';
import { getAvatarSource } from '../../src/lib/avatars';
import { colors, spacing, globalStyles } from '../../src/styles';

const AVATAR_OPTIONS = ['vinil', 'tape', 'globe', 'et', 'cat', 'owl'] as const;

export default function Profile() {
    const { user, initializing, logout, sendPasswordReset, linkGoogle } = useAuth();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [passwordResetSending, setPasswordResetSending] = useState(false);
    const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
    const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
    const [linkingGoogle, setLinkingGoogle] = useState(false);
    const [googleLinkMessage, setGoogleLinkMessage] = useState<string | null>(null);
    const [googleLinkError, setGoogleLinkError] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('vinil');
    const [initialValues, setInitialValues] = useState({ displayName: '', avatar: 'vinil' });

    const hasChanges =
        displayName !== initialValues.displayName ||
        selectedAvatar !== initialValues.avatar;

    useEffect(() => {
        if (initializing || !user) return;
        (async () => {
            try {
                const profile = await getMyProfile();
                setDisplayName(profile.display_name ?? '');
                setSelectedAvatar(profile.avatar);
                setInitialValues({
                    displayName: profile.display_name ?? '',
                    avatar: profile.avatar,
                });
            } catch (err) {
                console.warn('Failed to fetch profile:', err);
                setDisplayName(user?.displayName ?? '');
            } finally {
                setLoading(false);
            }
        })();
    }, [user, initializing]);

    async function handleSave() {
        setSaving(true);
        try {
            const updated = await updateMyProfile({
                display_name: displayName || null,
                avatar: selectedAvatar,
            });
            setDisplayName(updated.display_name ?? '');
            setSelectedAvatar(updated.avatar);
            setInitialValues({
                displayName: updated.display_name ?? '',
                avatar: updated.avatar,
            });
            Alert.alert('Saved', 'Your profile has been updated.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save profile';
            Alert.alert('Error', message);
        } finally {
            setSaving(false);
        }
    }

    async function handlePasswordReset() {
        if (!user?.email || !user.providerIds.includes('password')) return;

        setPasswordResetSending(true);
        setPasswordResetMessage(null);
        setPasswordResetError(null);
        try {
            await sendPasswordReset(user.email);
            setPasswordResetMessage(`Password reset email sent to ${user.email}. Check your inbox and spam folder.`);
        } catch (err) {
            setPasswordResetError(err instanceof Error ? err.message : 'Unable to send a password reset link.');
        } finally {
            setPasswordResetSending(false);
        }
    }

    async function handleLinkGoogle() {
        if (linkingGoogle || user?.providerIds.includes('google.com')) return;

        setLinkingGoogle(true);
        setGoogleLinkMessage(null);
        setGoogleLinkError(null);
        try {
            await linkGoogle();
            setGoogleLinkMessage('Google account linked successfully.');
        } catch (err: any) {
            const code = err?.code;
            if (code === 'auth/credential-already-in-use' || code === 'auth/provider-already-linked') {
                setGoogleLinkError('This Google account is already linked to another account.');
            } else if (code === 'auth/popup-closed-by-user' || code === 'SIGN_IN_CANCELLED') {
                setGoogleLinkError('Google linking was cancelled.');
            } else if (code === 'auth/network-request-failed') {
                setGoogleLinkError('Network error. Check your connection and try again.');
            } else {
                setGoogleLinkError('Unable to link Google right now.');
            }
        } finally {
            setLinkingGoogle(false);
        }
    }

    if (loading) {
        return (
            <View
                style={[
                    globalStyles.container,
                    { paddingTop: insets.top + spacing.xl },
                ]}
            >
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
                alignItems: 'center',
            }}
        >
            <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
                <Image
                    source={getAvatarSource(selectedAvatar)}
                    style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        marginBottom: spacing.lg,
                    }}
                />
                <Text style={globalStyles.title}>
                    {displayName || user?.email || 'User'}
                </Text>
                {user?.email && (
                    <Text style={globalStyles.secondaryText}>{user.email}</Text>
                )}
            </View>

            <View style={{ width: '100%', marginBottom: spacing.lg }}>
                <Text style={[globalStyles.caption, { marginBottom: spacing.sm }]}>
                    Display Name
                </Text>
                <TextInput
                    style={globalStyles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter display name"
                    placeholderTextColor={colors.text.secondary}
                />
            </View>

            <View style={{ width: '100%' }}>
                <Text style={[globalStyles.caption, { marginBottom: spacing.md }]}>
                    Avatar
                </Text>
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing.md,
                        justifyContent: 'center',
                    }}
                >
                    {AVATAR_OPTIONS.map((avatar) => (
                        <Pressable
                            key={avatar}
                            onPress={() => setSelectedAvatar(avatar)}
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: 36,
                                borderWidth: selectedAvatar === avatar ? 2.5 : 0,
                                borderColor: colors.brand,
                                opacity: selectedAvatar === avatar ? 1 : 0.55,
                            }}
                        >
                            <Image
                                source={getAvatarSource(avatar)}
                                style={{ width: '100%', height: '100%', borderRadius: 36 }}
                            />
                        </Pressable>
                    ))}
                </View>
            </View>

            <Pressable
                style={({ pressed }) => ({
                    ...globalStyles.pillButton,
                    marginTop: spacing.xxl * 1.5,
                    opacity: pressed || !hasChanges || saving ? 0.8 : 1,
                })}
                onPress={handleSave}
                disabled={!hasChanges || saving}
            >
                {saving ? (
                    <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                    <Text style={globalStyles.pillButtonText}>Save</Text>
                )}
            </Pressable>

            {user?.email && user.providerIds.includes('password') ? (
                <Pressable
                    style={({ pressed }) => ({
                        ...globalStyles.pillButton,
                        marginTop: spacing.lg,
                        opacity: pressed || passwordResetSending ? 0.55 : 1,
                    })}
                    onPress={handlePasswordReset}
                    disabled={passwordResetSending}
                >
                    {passwordResetSending ? (
                        <ActivityIndicator size="small" color={colors.text.primary} />
                    ) : (
                        <Text style={globalStyles.pillButtonText}>Reset password</Text>
                    )}
                </Pressable>
            ) : null}
            {passwordResetMessage ? (
                <Text style={[globalStyles.small, { color: colors.brand, marginTop: spacing.md, textAlign: 'center' }]}>
                    {passwordResetMessage}
                </Text>
            ) : null}
            {passwordResetError ? (
                <Text style={[globalStyles.errorText, { marginTop: spacing.md }]}>
                    {passwordResetError}
                </Text>
            ) : null}

            <Pressable
                style={({ pressed }) => ({
                    ...globalStyles.pillButton,
                    marginTop: spacing.lg,
                    opacity: pressed || linkingGoogle ? 0.55 : 1,
                })}
                onPress={handleLinkGoogle}
                disabled={linkingGoogle || user?.providerIds.includes('google.com')}
            >
                {linkingGoogle ? (
                    <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                    <Text style={globalStyles.pillButtonText}>
                        {user?.providerIds.includes('google.com') ? 'Google linked' : 'Link Google'}
                    </Text>
                )}
            </Pressable>
            {googleLinkMessage ? (
                <Text style={[globalStyles.small, { color: colors.brand, marginTop: spacing.md, textAlign: 'center' }]}>
                    {googleLinkMessage}
                </Text>
            ) : null}
            {googleLinkError ? (
                <Text style={[globalStyles.errorText, { marginTop: spacing.md }]}>
                    {googleLinkError}
                </Text>
            ) : null}

            <Pressable
                style={({ pressed }) => ({
                    ...globalStyles.pillButton,
                    marginTop: spacing.lg,
                    opacity: pressed ? 0.8 : 1,
                })}
                onPress={logout}
            >
                <Text style={globalStyles.pillButtonText}>Sign out</Text>
            </Pressable>
        </ScrollView>
    );
}
