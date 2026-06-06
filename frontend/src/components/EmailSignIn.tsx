import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, fontSizes, borderRadius, spacing, globalStyles } from '../styles';

const EmailSignIn = () => {
    const { emailSignIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const getErrorMessage = (code: string) => {
        switch (code) {
            case 'auth/invalid-credential':
                return 'Wrong email or password.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            default:
                return 'Unable to sign in right now.';
        }
    };

    const onSubmit = async () => {
        const cleanEmail = email.trim();
        if (!cleanEmail || !password) {
            setError('Email and password are required.');
            return;
        }

        if (processing) return;

        setProcessing(true);
        setError('');

        try {
            await emailSignIn(cleanEmail, password);
        } catch (error: any) {
            setError(getErrorMessage(error?.code));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <TextInput
                placeholder="Email"
                placeholderTextColor={colors.text.secondary}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                style={globalStyles.input}
            />
            <TextInput
                placeholder="Password"
                placeholderTextColor={colors.text.secondary}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                blurOnSubmit
                value={password}
                onChangeText={setPassword}
                style={globalStyles.input}
            />
            {!!error && <Text style={globalStyles.errorText}>{error}</Text>}
            <Pressable
                style={({ pressed }) => ({
                    ...globalStyles.primaryPillButton,
                    width: '100%',
                    opacity: pressed ? 0.9 : 1,
                })}
                onPress={onSubmit}
                disabled={processing}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {processing && <ActivityIndicator color={colors.text.primary} style={globalStyles.activityIndicator} />}
                    <Text style={globalStyles.primaryPillButtonText}>
                        {processing ? 'Signing in...' : 'Sign in'}
                    </Text>
                </View>
            </Pressable>
        </>
    );
}

export default EmailSignIn;
