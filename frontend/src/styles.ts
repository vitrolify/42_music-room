import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

type GlobalStyles = {
    container: ViewStyle;
    input: ViewStyle;
    button: ViewStyle;
    buttonText: TextStyle;
    errorText: TextStyle;
};

const globalStyles: GlobalStyles = {
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    input: {
        width: '100%',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    errorText: {
        color: '#b00020',
        marginBottom: 10,
    },
};

export default StyleSheet.create(globalStyles);