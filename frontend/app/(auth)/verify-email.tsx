import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, globalStyles, spacing } from '../../src/styles';

export default function VerifyEmailScreen() {
    const { user, resendVerificationEmail, refreshUser, logout } = useAuth();
    const insets = useSafeAreaInsets();
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleResend() {
        if (processing) return;
        setProcessing(true);
        setError(null);
        setMessage(null);
        try {
            await resendVerificationEmail();
            setMessage('Verification email sent. Check your inbox and spam folder.');
        } catch (err: any) {
            setError(getVerificationErrorMessage(err?.code));
        } finally {
            setProcessing(false);
        }
    }

    async function handleCheckVerification() {
        if (processing) return;
        setProcessing(true);
        setError(null);
        setMessage(null);
        try {
            await refreshUser();
            setMessage('Verification status refreshed.');
        } catch (err: any) {
            setError(getVerificationErrorMessage(err?.code));
        } finally {
            setProcessing(false);
        }
    }

    return (
        <View style={[globalStyles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
            <Text style={[globalStyles.title, { marginBottom: spacing.lg }]}>Verify your email</Text>
            <Text style={[globalStyles.secondaryText, { textAlign: 'center', marginBottom: spacing.lg }]}>
                We sent a verification link to {user?.email || 'your email address'}. Verify it before continuing.
            </Text>
            {message ? <Text style={[globalStyles.small, { color: colors.semantic.info, textAlign: 'center', marginBottom: spacing.md }]}>{message}</Text> : null}
            {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
            <Pressable
                style={({ pressed }) => ({ ...globalStyles.primaryPillButton, width: '100%', opacity: pressed || processing ? 0.7 : 1 })}
                onPress={handleCheckVerification}
                disabled={processing}
            >
                {processing ? <ActivityIndicator color={colors.text.primary} /> : <Text style={globalStyles.primaryPillButtonText}>I verified my email</Text>}
            </Pressable>
            <Pressable
                style={({ pressed }) => ({ ...globalStyles.pillButton, width: '100%', marginTop: spacing.md, opacity: pressed || processing ? 0.7 : 1 })}
                onPress={handleResend}
                disabled={processing}
            >
                <Text style={globalStyles.pillButtonText}>Resend email</Text>
            </Pressable>
            <Pressable onPress={logout} disabled={processing} style={{ marginTop: spacing.xl }}>
                <Text style={globalStyles.link}>Sign out</Text>
            </Pressable>
        </View>
    );
}

function getVerificationErrorMessage(code?: string) {
    switch (code) {
        case 'auth/too-many-requests': return 'Too many requests. Please wait before trying again.';
        case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
        case 'auth/user-token-expired': return 'Your session expired. Please sign in again.';
        default: return 'Unable to update your verification status right now.';
    }
}
