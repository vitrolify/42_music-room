import { Alert, Platform } from 'react-native';

export type AlertButton = {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
};

export function showAlert(title: string, message: string, buttons?: AlertButton[]): void {
    if (Platform.OS === 'web') {
        const actionable = buttons?.find(button => button.style !== 'cancel');
        const hasCancel = buttons?.some(button => button.style === 'cancel');
        const text = [title, message].filter(Boolean).join('\n\n');

        if (!buttons || buttons.length === 0) {
            window.alert(text);
        } else if (actionable && hasCancel) {
            if (window.confirm(text)) {
                actionable.onPress?.();
            }
        } else if (actionable) {
            window.alert(text);
            actionable.onPress?.();
        } else {
            window.alert(text);
        }
        return;
    }

    Alert.alert(title, message, buttons);
}