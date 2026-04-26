import { Button, Platform } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useAuth } from '../contexts/AuthContext';

const LoginButton = () => {
    const { googleSignIn } = useAuth();

    if (Platform.OS === 'web') {
        return <Button title="Sign in with Google" onPress={googleSignIn} />;
    }
    
    return (
        <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={() => {
                googleSignIn();
            }}
            // disabled={isInProgress}
        />
    )
}

export default LoginButton