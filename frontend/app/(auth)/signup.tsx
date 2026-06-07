import { Link } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmailSignUp from '../../src/components/EmailSignUp';
import { globalStyles, spacing, colors } from '../../src/styles';

export default function SignUpScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                globalStyles.container,
                { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
            ]}
        >
            <EmailSignUp />
            <Link
                href="/(auth)"
                style={[globalStyles.link, { marginTop: spacing.lg }]}
            >
                Back to sign in
            </Link>
        </View>
    );
}
