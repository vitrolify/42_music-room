import { Tabs } from 'expo-router';
import { House, MagnifyingGlass, Playlist, UsersThree, UserCircle } from 'phosphor-react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../src/styles';

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const useSideNav = width >= 900;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarPosition: useSideNav ? 'left' : 'bottom',
                tabBarLabelPosition: useSideNav ? 'beside-icon' : 'below-icon',
                tabBarActiveTintColor: colors.brand,
                tabBarInactiveTintColor: colors.text.secondary,
                tabBarActiveBackgroundColor: useSideNav ? colors.bg.elevated : 'transparent',
                tabBarInactiveBackgroundColor: 'transparent',
                tabBarStyle: useSideNav
                    ? {
                        backgroundColor: colors.bg.surface,
                        borderRightColor: colors.border.gray,
                        borderRightWidth: 0.5,
                        borderTopWidth: 0,
                        width: 104,
                        paddingTop: insets.top + spacing.xl,
                        paddingBottom: insets.bottom + spacing.xl,
                    }
                    : {
                        backgroundColor: colors.bg.surface,
                        borderTopColor: colors.border.gray,
                        borderTopWidth: 0.5,
                        paddingTop: spacing.sm / 2,
                        height: 56 + insets.bottom,
                        paddingBottom: insets.bottom + spacing.xs,
                    },
                tabBarItemStyle: useSideNav
                    ? {
                        height: 76,
                        paddingVertical: spacing.sm,
                        marginHorizontal: spacing.sm,
                        borderRadius: 10,
                    }
                    : undefined,
                tabBarLabelStyle: {
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 10,
                    marginTop: useSideNav ? spacing.xs : -2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused, color, size }) => (
                        <House weight={focused ? 'fill' : 'bold'} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ focused, color, size }) => (
                        <MagnifyingGlass weight={focused ? 'fill' : 'bold'} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="playlists"
                options={{
                    title: 'Playlists',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Playlist weight={focused ? 'fill' : 'bold'} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="friends"
                options={{
                    title: 'Friends',
                    tabBarIcon: ({ focused, color, size }) => (
                        <UsersThree weight={focused ? 'fill' : 'bold'} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused, color, size }) => (
                        <UserCircle weight={focused ? 'fill' : 'bold'} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="playlist/[id]"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="user/[id]"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
