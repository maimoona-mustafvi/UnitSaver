"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorMessage } from "@/lib/firebase";
import { useData } from "./DataProvider";
import { Button } from "./ui";

/** Top-right landing button: open the app when signed in, otherwise Google sign-in. */
export function HeaderAuth() {
  const { user, authEnabled, authReady, signInGoogle } = useData();
  const router = useRouter();
  if (user || !authEnabled || !authReady) {
    return (
      <Button variant="white" href="/dashboard">
        Open app
      </Button>
    );
  }
  return (
    <Button variant="white" onClick={() => signInGoogle().then(() => router.push("/dashboard"), () => undefined)}>
      Sign in
    </Button>
  );
}

/** Hero call to action: Google sign-in or guest, or "Open app" when already signed in. */
export function HeroAuth() {
  const { user, authEnabled, authReady, signInGoogle, signInGuest } = useData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!authEnabled) {
    return (
      <Button variant="lime" href="/setup">
        Get Started <span>→</span>
      </Button>
    );
  }
  if (!authReady) {
    // Firebase is still restoring the session; don't flash sign-in buttons at someone who is signed in.
    return (
      <div className="auth-actions">
        <Button variant="lime" disabled>
          …
        </Button>
      </div>
    );
  }
  if (user) {
    return (
      <div className="auth-actions">
        <Button variant="lime" href="/dashboard">
          Open app <span>→</span>
        </Button>
        <small>{user.isGuest ? "Signed in as a guest" : `Signed in as ${user.name ?? user.email}`}</small>
      </div>
    );
  }

  async function go(signIn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await signIn();
      router.push("/dashboard");
    } catch (e) {
      setError(authErrorMessage(e) ?? "");
      setBusy(false);
    }
  }

  return (
    <div className="auth-actions">
      <Button variant="lime" onClick={() => go(signInGoogle)} disabled={busy}>
        <span className="google-g" aria-hidden>
          G
        </span>
        Sign in with Google
      </Button>
      <Button variant="white" onClick={() => go(signInGuest)} disabled={busy}>
        Continue as guest
      </Button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <small>Guests can sign in with Google later and keep their data.</small>
    </div>
  );
}
