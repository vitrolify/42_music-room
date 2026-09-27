import { Alert, Platform } from 'react-native';

export function confirmDestructiveAction(
    title: string,
    message: string,
): Promise<boolean> {
    if (Platform.OS === 'web') {
        return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
    }

    return new Promise(resolve => {
        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ]);
    });
}
