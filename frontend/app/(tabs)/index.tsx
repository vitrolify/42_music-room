import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoutButton from '../../src/components/LogoutButton';
import { colors, fonts, fontSizes, spacing, globalStyles } from '../../src/styles';

export default function Home() {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                globalStyles.container,
                { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
            ]}
        >
            <Text style={globalStyles.title}>Home Screen</Text>
            <View style={{ marginTop: spacing.xxl }}>
                <LogoutButton />
            </View>
        </View>
    );
}
