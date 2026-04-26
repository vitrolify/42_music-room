import auth, { FirebaseAuthTypes, GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import type { AuthType } from '../types/auth.types';

GoogleSignin.configure({
	webClientId: '285211482256-kudr2dtic7g88cufe1lsup7etff4uq1k.apps.googleusercontent.com',
});

export type AuthUser = AuthType;

function mapUser(user: FirebaseAuthTypes.User | null): AuthUser | null {
	if (!user) {
		return null;
	}

	return {
		uid: user.uid,
		email: user.email ?? '',
		displayName: user.displayName ?? '',
		photoURL: user.photoURL ?? '',
		emailVerified: user.emailVerified,
	};
}

export function onAuthStateChanged(callback: (user: AuthUser | null) => void) {
	return auth().onAuthStateChanged((user) => {
		callback(mapUser(user));
	});
}

export async function signInWithGoogle() {
	console.log('Starting Google Sign-In process...');

	try {
		await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
		const signInResult = (await GoogleSignin.signIn()) as {
			data?: {
				idToken?: string | null;
			};
		};

		const idToken = signInResult.data?.idToken;

		if (!idToken) {
			throw new Error('No ID token found');
		}

		const googleCredential = GoogleAuthProvider.credential(idToken);
		await auth().signInWithCredential(googleCredential);
	} catch (error: any) {
		if (error.code === statusCodes.SIGN_IN_CANCELLED) {
			console.log('User cancelled the login flow');
		} else if (error.code === statusCodes.IN_PROGRESS) {
			console.log('Sign in is in progress already');
		} else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
			console.log('Play services not available or outdated');
		}

		throw error;
	}
}

export async function signOutUser() {
	await auth().signOut();

	try {
		await GoogleSignin.signOut();
	} catch {
		// Ignore Google sign-out failures so Firebase sign-out still succeeds.
	}
}

export async function signInWithEmail(email: string, password: string) {
	await auth().signInWithEmailAndPassword(email, password);
}
