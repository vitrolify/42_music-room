import { createContext, useEffect, useState, use } from 'react';
import { GoogleAuthProvider, getAuth, signInWithCredential, onAuthStateChanged, signOut } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthType } from '../types/auth.types';

type AuthContextType = {
    user: AuthType | null;
    setUser: (user: AuthType | null) => void;
    isLoggedIn: boolean;
    login: () => Promise<void>;
    googleSignIn: () => Promise<void>; // alias for login
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType |null>(null);

GoogleSignin.configure({
    webClientId: '285211482256-kudr2dtic7g88cufe1lsup7etff4uq1k.apps.googleusercontent.com', // from google-services.json
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState<AuthType | null>(null);

    function handleAuthStateChanged(user: AuthType | null) {
        setUser(user);
        if (initializing) setInitializing(false);
    }

    useEffect(() => {
        const subscriber = onAuthStateChanged(getAuth(), handleAuthStateChanged);
        return subscriber;
    }, []);

    async function googleSignIn() {
        console.log('Starting Google Sign-In process...');
        let idToken;

        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const signInResult = await GoogleSignin.signIn();

            idToken = signInResult.data?.idToken;
            if (!idToken) {
                idToken = signInResult.idToken;
            }
            if (!idToken) {
                throw new Error('No ID token found');
            }

            const googleCredential = GoogleAuthProvider.credential(idToken);

            return signInWithCredential(getAuth(), googleCredential);
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('User cancelled the login flow');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log('Sign in is in progress already');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                console.log('Play services not available or outdated');
            } else {
                console.error(error);
            }
            return;
        }
    }

    const logout = async () => {
        try {
            signOut(getAuth());
            console.log('User signed out successfully');
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    }


    return (
        <AuthContext.Provider value={{ user, setUser, isLoggedIn: !!user, login: googleSignIn, googleSignIn, logout }}>
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