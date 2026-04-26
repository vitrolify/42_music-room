import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import globalStyles from '../styles';

const EmailSignUp = () => {
    const { emailSignUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const getErrorMessage = (code: string) => {
        switch (code) {
            case 'auth/email-already-in-use':
                return 'This email is already in use. Try signing in.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            default:
                return 'Unable to sign up right now.';
        }
    };

    const onSubmit = async () => {
        const cleanEmail = email.trim();
        if (!cleanEmail || !password || password !== confirmPassword) {
            setError('Passwords must match and all fields are required.');
            return;
        }

        if (processing) {
            return;
        }

        setProcessing(true);
        setError('');

        try {
            await emailSignUp(cleanEmail, password);
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
                returnKeyType="next"
                value={password}
                onChangeText={setPassword}
                style={globalStyles.input}
            />
            <TextInput
                placeholder="Confirm Password"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                blurOnSubmit
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={globalStyles.input}
            />
            {!!error && <Text style={globalStyles.errorText}>{error}</Text>}
            <Pressable style={globalStyles.button} onPress={onSubmit} disabled={processing}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {processing && <ActivityIndicator color="#fff" />}
                    <Text style={globalStyles.buttonText}>
                        {processing ? 'Signing up...' : 'Sign up with Email'}
                    </Text>
                </View>
            </Pressable>
        </>
    );
}

export default EmailSignUp;
