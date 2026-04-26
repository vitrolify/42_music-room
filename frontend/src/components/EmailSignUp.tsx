import { Pressable, Text, TextInput } from 'react-native';
import globalStyles from '../styles';

const EmailSignUp = () => {
    return (
        <>
            <TextInput placeholder="Email" style={globalStyles.input} />
            <TextInput placeholder="Password" secureTextEntry style={globalStyles.input} />
            <TextInput placeholder="Confirm Password" secureTextEntry style={globalStyles.input} />
            <Pressable style={globalStyles.button} onPress={() => {}}>
                <Text style={globalStyles.buttonText}>Sign up with Email</Text>
            </Pressable>
        </>
    );
}

export default EmailSignUp;
