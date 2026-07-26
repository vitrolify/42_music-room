import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged as webOnAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendEmailVerification as firebaseSendEmailVerification,
  reload,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  linkWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import type { AuthType } from '../types/auth.types';

const firebaseConfig = {
  apiKey: 'AIzaSyCgdG_j3CSXq4AxA6rQevgf_sWer25FKtU',
  authDomain: 'vitrolify-5c94a.firebaseapp.com',
  projectId: 'vitrolify-5c94a',
  storageBucket: 'vitrolify-5c94a.firebasestorage.app',
  messagingSenderId: '285211482256',
  appId: '1:285211482256:web:eaa26862eb17e2643f2015',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export type AuthUser = AuthType;

function mapUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    emailVerified: user.emailVerified,
    providerIds: user.providerData.map((provider) => provider.providerId),
  };
}

export function onAuthStateChanged(callback: (user: AuthUser | null) => void) {
  return webOnAuthStateChanged(auth, (user) => {
    callback(mapUser(user));
  });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  await signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const credentials = await createUserWithEmailAndPassword(auth, email, password);
  await firebaseSendEmailVerification(credentials.user);
}

export async function sendEmailVerification() {
  if (auth.currentUser) await firebaseSendEmailVerification(auth.currentUser);
}

export async function refreshAuthUser(): Promise<AuthUser | null> {
  if (!auth.currentUser) return null;

  await reload(auth.currentUser);
  return mapUser(auth.currentUser);
}

export async function sendPasswordResetEmail(email: string) {
  await firebaseSendPasswordResetEmail(auth, email);
}

export async function linkGoogleAccount() {
  if (!auth.currentUser) throw new Error('No authenticated user.');

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await linkWithPopup(auth.currentUser, provider);
}

export async function signOutUser() {
  await signOut(auth);
}

export async function getAuthToken(): Promise<string | null> {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(false);
}
