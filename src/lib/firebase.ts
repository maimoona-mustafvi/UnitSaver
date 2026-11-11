import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  linkWithPopup,
  onIdTokenChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Key } from "@/i18n";

// Each NEXT_PUBLIC_ var must be referenced literally so Next.js inlines it into the client bundle.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

export function getFirebase() {
  if (!firebaseConfigured) throw new Error("Firebase env vars are missing");
  const app = getApps()[0] ?? initializeApp(config);
  return { auth: getAuth(app), db: getFirestore(app) };
}

/** Fires on sign-in, sign-out and when a guest is upgraded to Google (same uid, new token). */
export const watchUser = (cb: (user: User | null) => void) => onIdTokenChanged(getFirebase().auth, cb);

export const continueAsGuest = () => signInAnonymously(getFirebase().auth);

export const signOutUser = () => signOut(getFirebase().auth);

/** Google sign-in. A guest is upgraded in place (same uid), so everything they saved as a guest is kept. */
export async function signInWithGoogle() {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  const current = auth.currentUser;
  if (!current?.isAnonymous) return signInWithPopup(auth, provider);
  try {
    const result = await linkWithPopup(current, provider);
    await result.user.getIdToken(true); // makes onIdTokenChanged report the upgraded (non-anonymous) user
    return result;
  } catch (e) {
    // This Google account already has UnitSaver data: switch to it (the guest's data stays with the guest).
    const code = (e as { code?: string }).code;
    const credential = code === "auth/credential-already-in-use" ? GoogleAuthProvider.credentialFromError(e as never) : null;
    if (credential) return signInWithCredential(auth, credential);
    throw e;
  }
}

/** Translation key for a Firebase auth error; null when the user just closed the popup. */
export function authErrorKey(e: unknown): Key | null {
  const code = (e as { code?: string }).code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (code === "auth/operation-not-allowed") return "auth.err.notEnabled";
  if (code === "auth/popup-blocked") return "auth.err.popupBlocked";
  if (code === "auth/unauthorized-domain") return "auth.err.domain";
  if (code === "auth/network-request-failed") return "auth.err.network";
  return "auth.err.generic";
}
