import { Pressable, Text, TextInput } from 'react-native';
import globalStyles from '../styles';

const EmailSignIn = () => {
    return (
        <>
            <TextInput placeholder="Email" style={globalStyles.input} />
            <TextInput placeholder="Password" secureTextEntry style={globalStyles.input} />
            <Pressable style={globalStyles.button} onPress={() => {}}>
                <Text style={globalStyles.buttonText}>Sign in with Email</Text>
            </Pressable>
        </>
    );
}

export default EmailSignIn;
