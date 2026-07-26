import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, globalStyles, spacing } from '../../src/styles';

export default function ForgotPasswordScreen() {
    const { sendPasswordReset } = useAuth();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [processing, setProcessing] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit() {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
            setError('Please enter your email address.');
            return;
        }
        if (processing) return;

        setProcessing(true);
        setError(null);
        try {
            await sendPasswordReset(cleanEmail);
            setSubmitted(true);
        } catch (err: any) {
            if (err?.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (err?.code === 'auth/network-request-failed') {
                setError('Network error. Check your connection and try again.');
            } else if (err?.code === 'auth/too-many-requests') {
                setError('Too many requests. Please wait before trying again.');
            } else {
                // Avoid exposing whether an account exists.
                setSubmitted(true);
            }
        } finally {
            setProcessing(false);
        }
    }

    return (
        <View style={[globalStyles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
            <Text style={[globalStyles.title, { marginBottom: spacing.lg }]}>Reset password</Text>
            {submitted ? (
                <>
                    <Text style={[globalStyles.secondaryText, { textAlign: 'center', marginBottom: spacing.xl }]}>
                        If an account uses this email, a password reset link has been sent. Check your inbox and spam folder.
                    </Text>
                    <Link href="/(auth)" asChild>
                        <Pressable style={globalStyles.primaryPillButton}>
                            <Text style={globalStyles.primaryPillButtonText}>Back to sign in</Text>
                        </Pressable>
                    </Link>
                </>
            ) : (
                <>
                    <Text style={[globalStyles.secondaryText, { textAlign: 'center', marginBottom: spacing.lg }]}>
                        Enter your account email and we will send you a reset link.
                    </Text>
                    <TextInput
                        placeholder="Email"
                        placeholderTextColor={colors.text.secondary}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        style={globalStyles.input}
                        autoFocus
                    />
                    {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
                    <Pressable
                        style={({ pressed }) => ({ ...globalStyles.primaryPillButton, width: '100%', opacity: pressed || processing ? 0.7 : 1 })}
                        onPress={handleSubmit}
                        disabled={processing}
                    >
                        {processing ? <ActivityIndicator color={colors.text.primary} /> : <Text style={globalStyles.primaryPillButtonText}>Send reset link</Text>}
                    </Pressable>
                    <Link href="/(auth)" style={[globalStyles.link, { marginTop: spacing.lg }]}>Back to sign in</Link>
                </>
            )}
        </View>
    );
}
