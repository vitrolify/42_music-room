import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import globalStyles from '../styles';

const EmailSignIn = () => {
    const { emailSignIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

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

        setError('');

        try {
            await emailSignIn(cleanEmail, password);
        } catch (error: any) {
            setError(getErrorMessage(error?.code));
        }
    };

    return (
        <>
            <TextInput
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={globalStyles.input}
            />
            <TextInput
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={globalStyles.input}
            />
            {!!error && <Text style={globalStyles.errorText}>{error}</Text>}
            <Pressable style={globalStyles.button} onPress={onSubmit}>
                <Text style={globalStyles.buttonText}>Sign in with Email</Text>
            </Pressable>
        </>
    );
}

export default EmailSignIn;
