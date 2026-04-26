import { Button, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LoginButton = () => {
    const { googleSignIn } = useAuth();

    if (Platform.OS === 'web') {
        return <Button title="Sign in with Google" onPress={googleSignIn} />;
    }
    
    return <Button title="Sign in with Google" onPress={googleSignIn} />;
}

export default LoginButton