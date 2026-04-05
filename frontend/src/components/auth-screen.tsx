import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import LoginButton from './LoginButton';
import LogoutButton from './LogoutButton';

const AuthScreen = () => {
    const { user } = useAuth();

    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {!user && <LoginButton />}
            {user && (
                <>
                    <Text style={styles.welcomeText}>Welcome {user.displayName}</Text>
                    <LogoutButton />
                </>
            )}
        </View>
    )
}

export default AuthScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    welcomeText: {
        backgroundColor: 'lightblue',
        fontSize: 20,
        marginBottom: 20,
        marginTop: 80,
    },
})