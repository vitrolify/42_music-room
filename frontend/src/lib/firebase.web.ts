import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged as webOnAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
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

export async function signOutUser() {
  await signOut(auth);
}