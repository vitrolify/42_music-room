import { StyleSheet, View, TextInput, Button, Text} from 'react-native';
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
});
