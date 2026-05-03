import { Link } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginButton from '../../src/components/LoginButton';
import EmailSignIn from '../../src/components/EmailSignIn';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
        >
            <EmailSignIn />
            <Link href="/(auth)/signup" style={styles.signupLink}>
                Create an account
            </Link>
            <Text>or</Text>
            <LoginButton />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signupLink: {
        marginBottom: 16,
        color: '#007AFF',
    },
});
