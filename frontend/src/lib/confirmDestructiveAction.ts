import { Alert, Platform } from 'react-native';

export function confirmDestructiveAction(
    title: string,
    message: string,
    confirmText: string = 'Delete',
    cancelText: string = 'Cancel',
): Promise<boolean> {
    if (Platform.OS === 'web') {
        return Promise.resolve(Boolean(globalThis.confirm?.(`${title}\n\n${message}`)));
    }

    return new Promise(resolve => {
        Alert.alert(title, message, [
            { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
            { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
        ]);
    });
}
