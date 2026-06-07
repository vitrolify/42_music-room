import { Pressable, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { globalStyles } from '../styles';

const LoginButton = () => {
    const { googleSignIn } = useAuth();

    return (
        <Pressable
            style={({ pressed }) => ({
                ...globalStyles.pillButton,
                width: '100%',
                opacity: pressed ? 0.8 : 1,
            })}
            onPress={googleSignIn}
        >
            <Text style={globalStyles.pillButtonText}>Sign in with Google</Text>
        </Pressable>
    );
}

export default LoginButton;
