import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoutButton from '../../src/components/LogoutButton';

export default function Home() {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                { flex: 1, alignItems: 'center', justifyContent: 'center' },
                { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
        >
            <Text style={{ fontSize: 20, color: 'red' }}>Home Screen</Text>
            <LogoutButton />
        </View>
    );
}

