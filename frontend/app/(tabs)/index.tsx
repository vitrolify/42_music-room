import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoutButton from '../../src/components/LogoutButton';
import { colors, fonts, fontSizes, spacing, globalStyles } from '../../src/styles';

export default function Home() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                globalStyles.container,
                { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
            ]}
        >
            <Text style={globalStyles.title}>Home Screen</Text>
            <Pressable
                style={({ pressed }) => ({ ...globalStyles.primaryPillButton, marginTop: spacing.xxl, opacity: pressed ? 0.8 : 1 })}
                onPress={() => router.push('/player')}
            >
                <Text style={globalStyles.primaryPillButtonText}>Test Player</Text>
            </Pressable>
            <View style={{ marginTop: spacing.xxl }}>
                <LogoutButton />
            </View>
        </View>
    );
}
