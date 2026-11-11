"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorKey } from "@/lib/firebase";
import { useData } from "./DataProvider";
import { useI18n } from "./LanguageProvider";
import { Button } from "./ui";

/** Top-right landing button: open the app when signed in, otherwise Google sign-in. */
export function HeaderAuth() {
  const { user, authEnabled, authReady, signInGoogle } = useData();
  const { t } = useI18n();
  const router = useRouter();
  if (user || !authEnabled || !authReady) {
    return (
      <Button variant="white" href="/dashboard">
        {t("auth.openApp")}
      </Button>
    );
  }
  return (
    <Button variant="white" onClick={() => signInGoogle().then(() => router.push("/dashboard"), () => undefined)}>
      {t("auth.signIn")}
    </Button>
  );
}

/** Hero call to action: Google sign-in or guest, or "Open app" when already signed in. */
export function HeroAuth() {
  const { user, authEnabled, authReady, signInGoogle, signInGuest } = useData();
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!authEnabled) {
    return (
      <Button variant="lime" href="/setup">
        {t("auth.getStarted")}
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
          {t("auth.openAppArrow")}
        </Button>
        <small>{user.isGuest ? t("auth.signedInGuest") : t("auth.signedInAs", { name: user.name ?? user.email ?? "" })}</small>
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
      const key = authErrorKey(e);
      setError(key ? t(key) : "");
      setBusy(false);
    }
  }

  return (
    <div className="auth-actions">
      <Button variant="lime" onClick={() => go(signInGoogle)} disabled={busy}>
        <span className="google-g" aria-hidden>
          G
        </span>
        {t("auth.google")}
      </Button>
      <Button variant="white" onClick={() => go(signInGuest)} disabled={busy}>
        {t("auth.guest")}
      </Button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <small>{t("auth.guestNote")}</small>
    </div>
  );
}
