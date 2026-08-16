import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { colors } from '../src/styles';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
    const { isLoggedIn, emailVerified, initializing } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        if (initializing) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inVerificationScreen = segments.join('/') === '(auth)/verify-email';

        if (!isLoggedIn && inVerificationScreen) {
            router.replace('/(auth)');
        } else if (!isLoggedIn && !inAuthGroup) {
            router.replace('/(auth)');
        } else if (isLoggedIn && !emailVerified && !inVerificationScreen) {
            router.replace('/(auth)/verify-email');
        } else if (isLoggedIn && emailVerified && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [emailVerified, initializing, isLoggedIn, segments, router]);

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg.base },
            }}
        >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="player" />
        </Stack>
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        Montserrat_700Bold,
    });

    const [appReady, setAppReady] = useState(false);

    useEffect(() => {
        if (fontsLoaded) {
            setAppReady(true);
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!appReady) return null;

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </SafeAreaProvider>
    );
}
