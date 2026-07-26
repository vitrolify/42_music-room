import type { AuthType } from '../types/auth.types';

export type AuthUser = AuthType;

export function onAuthStateChanged() {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function signInWithGoogle() {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function signInWithEmail(email: string, password: string) {
    throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function signUpWithEmail(email: string, password: string) {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function sendEmailVerification() {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function refreshAuthUser(): Promise<AuthUser | null> {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function sendPasswordResetEmail(email: string) {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function linkGoogleAccount() {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function signOutUser() {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}

export async function getAuthToken(): Promise<string | null> {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}
