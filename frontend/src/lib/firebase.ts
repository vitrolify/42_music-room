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

export async function signOutUser() {
	throw new Error('Platform-specific Firebase auth module was not resolved.');
}