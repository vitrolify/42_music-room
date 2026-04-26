import { createContext, useEffect, useState, use } from 'react';
import {
    onAuthStateChanged,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
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
    emailSignIn: (email: string, password: string) => Promise<void>;
    emailSignUp: (email: string, password: string) => Promise<void>;
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

    async function emailSignIn(email: string, password: string) {
        return signInWithEmail(email, password);
    }

    async function emailSignUp(email: string, password: string) {
        return signUpWithEmail(email, password);
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
        <AuthContext.Provider value={{ user, setUser, isLoggedIn: !!user, initializing, login: googleSignIn, googleSignIn, emailSignIn, emailSignUp, logout }}>
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