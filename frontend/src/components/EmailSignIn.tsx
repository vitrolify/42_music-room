import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import globalStyles from '../styles';

const EmailSignIn = () => {
    const { emailSignIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onSubmit = async () => {
        const cleanEmail = email.trim();
        if (!cleanEmail || !password) {
            return;
        }

        await emailSignIn(cleanEmail, password);
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
            <Pressable style={globalStyles.button} onPress={onSubmit}>
                <Text style={globalStyles.buttonText}>Sign in with Email</Text>
            </Pressable>
        </>
    );
}

export default EmailSignIn;
