import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoutButton from '../../src/components/LogoutButton';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { usePlayerBarPadding } from '../../src/hooks/usePlayerBarPadding';
import { colors, fonts, fontSizes, spacing, globalStyles } from '../../src/styles';

export default function Home() {
    const insets = useSafeAreaInsets();
    const playerBarPadding = usePlayerBarPadding();
    const { setShowPlayer } = usePlayer();

    return (
        <View
            style={[
                globalStyles.container,
                { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl + playerBarPadding },
            ]}
        >
            <Text style={globalStyles.title}>Home Screen</Text>
            <Pressable
                style={({ pressed }) => ({ ...globalStyles.primaryPillButton, marginTop: spacing.xxl, opacity: pressed ? 0.8 : 1 })}
                onPress={() => setShowPlayer(true)}
            >
                <Text style={globalStyles.primaryPillButtonText}>Test Player</Text>
            </Pressable>
            <View style={{ marginTop: spacing.xxl }}>
                <LogoutButton />
            </View>
        </View>
    );
}
