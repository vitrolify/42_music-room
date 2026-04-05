import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useAuth } from '../contexts/AuthContext';

const LoginButton = () => {
    const { googleSignIn } = useAuth();
    
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