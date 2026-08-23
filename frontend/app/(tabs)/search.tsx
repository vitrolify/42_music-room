import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerBarPadding } from '../../src/hooks/usePlayerBarPadding';
import { colors, fonts, fontSizes, spacing, globalStyles } from '../../src/styles';

export default function Search() {
    const insets = useSafeAreaInsets();
    const playerBarPadding = usePlayerBarPadding();

    return (
        <View
            style={[
                globalStyles.container,
                { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl + playerBarPadding },
            ]}
        >
            <Text style={globalStyles.title}>Search Screen</Text>
        </View>
    );
}
