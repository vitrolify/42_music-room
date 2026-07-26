import { Link } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginButton from '../../src/components/LoginButton';
import EmailSignIn from '../../src/components/EmailSignIn';
import { colors, fonts, fontSizes, spacing, globalStyles } from '../../src/styles';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                globalStyles.container,
                { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
            ]}
        >
            <Text style={[globalStyles.title, { marginBottom: spacing.xxl }]}>
                Vitrolify
            </Text>
            <EmailSignIn />
            <Link
                href="/(auth)/forgot-password"
                style={[globalStyles.link, { marginTop: spacing.md }]}
            >
                Forgot password?
            </Link>
            <Link
                href="/(auth)/signup"
                style={[globalStyles.link, { marginTop: spacing.lg }]}
            >
                Create an account
            </Link>
            <Text style={globalStyles.separator}>or</Text>
            <LoginButton />
        </View>
    );
}
