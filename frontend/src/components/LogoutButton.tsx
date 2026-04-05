import { Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LogoutButton = () => {
    const { logout } = useAuth();

    return (
        <Button
            title="Sign out"
            onPress={() => {
                logout();
            }}
        />
    )
}

export default LogoutButton