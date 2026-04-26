import { createContext, useEffect, useState, use } from 'react';
import {
    onAuthStateChanged,
    signInWithGoogle,
    signOutUser,
    type AuthUser,
} from '../lib/firebase';
import { AuthType } from '../types/auth.types';

type AuthContextType = {
    user: AuthType | null;
    setUser: (user: AuthType | null) => void;
    isLoggedIn: boolean;
    initializing: boolean;
    login: () => Promise<void>;
    googleSignIn: () => Promise<void>; // alias for login
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType |null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState<AuthType | null>(null);

    function handleAuthStateChanged(user: AuthUser | null) {
        setUser(user);
        if (initializing) setInitializing(false);
    }

    useEffect(() => {
        const subscriber = onAuthStateChanged(handleAuthStateChanged);
        return subscriber;
    }, []);

    async function googleSignIn() {
        try {
            return await signInWithGoogle();
        } catch (error) {
            console.error('Error signing in with Google: ', error);
            return;
        }
    }

    const logout = async () => {
        try {
            await signOutUser();
            console.log('User signed out successfully');
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    }


    return (
        <AuthContext.Provider value={{ user, setUser, isLoggedIn: !!user, initializing, login: googleSignIn, googleSignIn, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => {
    const context = use(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export { AuthContext, AuthProvider, useAuth };