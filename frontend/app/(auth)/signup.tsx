import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import EmailSignUp from '../../src/components/EmailSignUp';

export default function SignUpScreen() {
    return (
        <View>
            <EmailSignUp />
            <Link href="/(auth)" asChild>
                <Text>Back to sign in</Text>
            </Link>
        </View>
    );
}