"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import type { UserData } from "@/types";
import { firestoreStore, localStore, type Store } from "@/lib/db";
import { continueAsGuest, firebaseConfigured, signInWithGoogle, signOutUser, watchUser } from "@/lib/firebase";
import { summarize, type Summary } from "@/lib/billing";
import { demoData } from "@/lib/demo";
import type { Key } from "@/i18n";

export interface AccountInfo {
  uid: string;
  isGuest: boolean;
  name: string | null;
  email: string | null;
  photo: string | null;
}

interface DataState {
  /** false until Firebase has told us whether someone is signed in. */
  authReady: boolean;
  user: AccountInfo | null;
  store?: Store;
  data?: UserData;
  warning?: Key;
  error?: string;
}

interface DataContext extends DataState {
  loading: boolean;
  /** Firebase is configured but nobody is signed in: the app pages send the visitor to the landing page. */
  needsAuth: boolean;
  authEnabled: boolean;
  summary: Summary | null;
  /** Runs a write against the store, then reloads so every page sees the saved state. */
  run: (fn: (store: Store) => Promise<unknown>) => Promise<void>;
  loadDemo: () => Promise<void>;
  reset: () => Promise<void>;
  signInGoogle: () => Promise<unknown>;
  signInGuest: () => Promise<unknown>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<DataContext | null>(null);

const toAccount = (u: User): AccountInfo => ({
  uid: u.uid,
  isGuest: u.isAnonymous,
  name: u.displayName,
  email: u.email,
  photo: u.photoURL,
});

const PUBLIC_PATHS = ["/"];

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ authReady: !firebaseConfigured, user: null });
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!firebaseConfigured) {
      // No Firebase config: everything lives in this browser, no sign-in needed.
      const store = localStore();
      store.load().then((data) => setState({ authReady: true, user: null, store, data }));
      return;
    }
    let currentUid: string | null | undefined;
    return watchUser(async (u) => {
      const user = u ? toAccount(u) : null;
      if (u && u.uid === currentUid) return setState((s) => ({ ...s, user })); // token refresh or guest → Google upgrade
      currentUid = u?.uid ?? null;
      setState({ authReady: true, user });
      if (!u) return;
      const store = firestoreStore(u.uid);
      try {
        const data = await store.load();
        if (currentUid === u.uid) setState({ authReady: true, user, store, data });
      } catch (e) {
        console.error("Firestore unavailable, using local storage", e);
        const local = localStore();
        const data = await local.load();
        if (currentUid === u.uid)
          setState({ authReady: true, user, store: local, data, warning: "shell.cloudWarning" });
      }
    });
  }, []);

  const needsAuth = firebaseConfigured && state.authReady && !state.user;
  useEffect(() => {
    if (needsAuth && !PUBLIC_PATHS.includes(path)) router.replace("/");
  }, [needsAuth, path, router]);

  const run = useCallback(
    async (fn: (store: Store) => Promise<unknown>) => {
      const store = state.store;
      if (!store) throw new Error("Data is still loading");
      await fn(store);
      const data = await store.load();
      setState((s) => ({ ...s, data }));
    },
    [state.store],
  );

  const value = useMemo<DataContext>(
    () => ({
      ...state,
      loading: !state.data && !state.error,
      needsAuth,
      authEnabled: firebaseConfigured,
      summary: state.data ? summarize(state.data) : null,
      run,
      loadDemo: () => run((s) => s.replaceAll(demoData())),
      reset: () => run((s) => s.replaceAll(null)),
      signInGoogle: signInWithGoogle,
      signInGuest: continueAsGuest,
      signOut: async () => {
        await signOutUser();
        router.replace("/");
      },
    }),
    [state, needsAuth, run, router],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
