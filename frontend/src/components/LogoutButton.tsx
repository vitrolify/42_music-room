import { Pressable, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { globalStyles } from '../styles';

const LogoutButton = () => {
    const { logout } = useAuth();

    return (
        <Pressable
            style={({ pressed }) => ({
                ...globalStyles.pillButton,
                opacity: pressed ? 0.8 : 1,
            })}
            onPress={logout}
        >
            <Text style={globalStyles.pillButtonText}>Sign out</Text>
        </Pressable>
    );
}

export default LogoutButton;
