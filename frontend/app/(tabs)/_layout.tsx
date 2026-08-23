import { Tabs, useRouter } from 'expo-router';
import { House, MagnifyingGlass, Playlist, UsersThree, UserCircle } from 'phosphor-react-native';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../src/styles';
import MiniPlayerBar from '../../src/components/MiniPlayerBar';
import { usePlayer } from '../../src/contexts/PlayerContext';

const MINI_PLAYER_HEIGHT = 64;

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const useSideNav = width >= 900;
    const { videoId } = usePlayer();
    const hasPlayer = !!videoId;
    const router = useRouter();

    function renderTabItems({ state, descriptors, navigation, horizontal }: any) {
        return state.routes
            .filter((route: any) => {
                const { options } = descriptors[route.key] ?? {};
                return options?.tabBarIcon != null;
            })
            .map((route: any) => {
                const { options } = descriptors[route.key] ?? {};
                const isFocused = state.index === state.routes.indexOf(route);
                const color = isFocused ? colors.brand : colors.text.secondary;
                const label = options?.tabBarLabel ?? options?.title ?? route.name;
                const icon = options?.tabBarIcon;

                const onPress = () => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                if (horizontal) {
                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
                        >
                            {icon?.({ focused: isFocused, color, size: 24 })}
                            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color, marginTop: -2 }}>
                                {typeof label === 'string' ? label : ''}
                            </Text>
                        </Pressable>
                    );
                }

                return (
                    <Pressable
                        key={route.key}
                        onPress={onPress}
                        style={{
                            height: 76,
                            paddingVertical: spacing.sm,
                            marginHorizontal: spacing.sm,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isFocused ? colors.bg.elevated : 'transparent',
                        }}
                    >
                        {icon?.({ focused: isFocused, color, size: 24 })}
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color, marginTop: spacing.xs }}>
                            {typeof label === 'string' ? label : ''}
                        </Text>
                    </Pressable>
                );
            });
    }

    function renderBottomTabBar(props: any) {
        return (
            <View style={{ backgroundColor: colors.bg.surface, borderTopColor: colors.border.gray, borderTopWidth: 0.5 }}>
                {hasPlayer && (
                    <MiniPlayerBar onPress={() => router.push('/player')} />
                )}
                <View style={{ flexDirection: 'row', paddingTop: spacing.sm / 2, height: 64 }}>
                    {renderTabItems({ ...props, horizontal: true })}
                </View>
                <View style={{ height: insets.bottom, backgroundColor: colors.bg.surface }} />
            </View>
        );
    }

    function renderSideTabBar(props: any) {
        return (
            <View
                style={{
                    backgroundColor: colors.bg.surface,
                    borderRightColor: colors.border.gray,
                    borderRightWidth: 0.5,
                    borderTopWidth: 0,
                    width: 104,
                    paddingTop: insets.top + spacing.xl,
                    paddingBottom: insets.bottom + spacing.xl,
                }}
            >
                {renderTabItems({ ...props, horizontal: false })}
            </View>
        );
    }

    return (
        <View style={{ flex: 1, flexDirection: useSideNav ? 'row' : 'column' }}>
            <Tabs
                tabBar={(props) => useSideNav ? renderSideTabBar(props) : renderBottomTabBar(props)}
                screenOptions={{
                    headerShown: false,
                    tabBarPosition: useSideNav ? 'left' : 'bottom',
                    tabBarLabelPosition: useSideNav ? 'beside-icon' : 'below-icon',
                    tabBarActiveTintColor: colors.brand,
                    tabBarInactiveTintColor: colors.text.secondary,
                    tabBarActiveBackgroundColor: useSideNav ? colors.bg.elevated : 'transparent',
                    tabBarInactiveBackgroundColor: 'transparent',
                    tabBarStyle: { display: 'none' },
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

            {hasPlayer && useSideNav && (
                <View
                    style={{
                        bottom: 0,
                        left: 104,
                        right: 0,
                        height: MINI_PLAYER_HEIGHT,
                        backgroundColor: colors.bg.surface,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.border.gray,
                        ...(Platform.OS === 'web' ? { position: 'fixed' as any } : { position: 'absolute' as any }),
                    }}
                >
                    <MiniPlayerBar onPress={() => router.push('/player')} />
                </View>
            )}
        </View>
    );
}
