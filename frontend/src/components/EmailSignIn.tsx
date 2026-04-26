import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import globalStyles from '../styles';

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

        if (processing) {
            return;
        }

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
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                style={globalStyles.input}
            />
            <TextInput
                placeholder="Password"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                blurOnSubmit
                value={password}
                onChangeText={setPassword}
                style={globalStyles.input}
            />
            {!!error && <Text style={globalStyles.errorText}>{error}</Text>}
            <Pressable style={globalStyles.button} onPress={onSubmit} disabled={processing}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {processing && <ActivityIndicator color="#fff" />}
                    <Text style={globalStyles.buttonText}>
                        {processing ? 'Signing in...' : 'Sign in with Email'}
                    </Text>
                </View>
            </Pressable>
        </>
    );
}

export default EmailSignIn;
