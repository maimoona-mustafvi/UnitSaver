"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import tariffs from "@/config/tariffs.json";
import { useData } from "@/components/DataProvider";
import { useI18n } from "@/components/LanguageProvider";
import { Card, Loading, Notice } from "@/components/ui";
import type { Lang } from "@/i18n";
import { authErrorKey } from "@/lib/firebase";
import type { Settings } from "@/types";

const initials = (name?: string | null) =>
  name
    ?.split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ME";

const COMPANIES = ["IESCO", "LESCO", "FESCO", "GEPCO", "MEPCO", "PESCO", "HESCO", "SEPCO", "QESCO", "TESCO"];

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <label className="setting-row">
      <span>
        <b>{title}</b>
        <small>{hint}</small>
      </span>
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const { loading, data, store, run, loadDemo, reset, user, authEnabled, signInGoogle, signOut } = useData();
  const { t, lang, setLang } = useI18n();
  const [status, setStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  if (loading || !data) return <Loading />;
  const s = data.settings;

  async function update(patch: Partial<Settings>) {
    setStatus(t("common.saving"));
    try {
      await run((st) => st.saveProfile({ settings: { ...s, ...patch } }));
      setStatus(t("common.saved"));
    } catch (e) {
      setStatus(t("common.couldntSave", { e: e instanceof Error ? e.message : String(e) }));
    }
  }
  const clampInt = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

  return (
    <>
      <Card className="profile-banner">
        <div className="profile-photo">
          {/* eslint-disable-next-line @next/next/no-img-element -- Google avatar URL, no image optimisation needed */}
          {user?.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer" /> : initials(user?.name)}
        </div>
        <div>
          <h2>{user && !user.isGuest ? (user.name ?? user.email) : t("st.household")}</h2>
          <p>{store?.mode !== "firebase" ? t("st.local") : user?.isGuest ? t("st.guestSync") : t("st.sync", { email: user?.email ?? "" })}</p>
          <b>{t("st.customer", { c: s.company })}</b>
        </div>
        <button onClick={() => loadDemo().then(() => setStatus(t("st.demoLoaded")))}>{t("common.loadDemo")}</button>
      </Card>
      {authEnabled && user && (
        <Card className="settings-list">
          <h2>{t("st.account")}</h2>
          {user.isGuest ? (
            <div className="setting-row">
              <span>
                <b>{t("st.googleTitle")}</b>
                <small>{t("st.googleText")}</small>
              </span>
              <button
                className="button blue"
                onClick={() =>
                  signInGoogle().then(
                    () => setStatus(t("st.signedInGoogle")),
                    (e) => {
                      const key = authErrorKey(e);
                      setStatus(key ? t(key) : "");
                    },
                  )
                }
              >
                {t("auth.signIn")}
              </button>
            </div>
          ) : (
            <div className="setting-row">
              <span>
                <b>{t("st.signedInGoogle")}</b>
                <small>{user.email}</small>
              </span>
              <button className="button white" style={{ border: "1px solid var(--grey)" }} onClick={signOut}>
                {t("st.signOut")}
              </button>
            </div>
          )}
        </Card>
      )}
      {status && (
        <p className="subtle" role="status" style={{ marginTop: 12 }}>
          {status}
        </p>
      )}

      <Card className="settings-list">
        <h2>{t("st.prefs")}</h2>
        <Row title={t("st.language")} hint={t("st.languageHint")}>
          <select className="setting-control" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="en" lang="en">
              English
            </option>
            <option value="ur" lang="ur">
              اردو
            </option>
          </select>
        </Row>
        <Row title={t("st.company")} hint={t("st.companyHint")}>
          <select className="setting-control" value={s.company} onChange={(e) => update({ company: e.target.value })}>
            {COMPANIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Row>
        <Row title={t("st.meter")} hint={t("st.meterHint")}>
          <select className="setting-control" value={s.meterType} onChange={(e) => update({ meterType: e.target.value as Settings["meterType"] })}>
            <option value="normal">{t("st.normal")}</option>
            <option value="tou">{t("st.tou")}</option>
          </select>
        </Row>
        <Row title={t("st.cycle")} hint={t("st.cycleHint")}>
          <input
            className="setting-control"
            type="number"
            min={1}
            max={31}
            key={`day-${s.billingCycleDay}`}
            defaultValue={s.billingCycleDay}
            onBlur={(e) => update({ billingCycleDay: clampInt(e.target.value, 1, 31) })}
          />
        </Row>
        <Row title={t("st.filer")} hint={t("st.filerHint")}>
          <select className="setting-control" value={s.isFiler ? "filer" : "non"} onChange={(e) => update({ isFiler: e.target.value === "filer" })}>
            <option value="filer">{t("st.filerOpt")}</option>
            <option value="non">{t("st.nonFiler")}</option>
          </select>
        </Row>
        <Row title={t("st.threshold")} hint={t("st.thresholdHint")}>
          <input
            className="setting-control"
            type="number"
            min={50}
            max={200}
            key={`alert-${s.alertThreshold}`}
            defaultValue={s.alertThreshold}
            onBlur={(e) => update({ alertThreshold: clampInt(e.target.value, 50, 200) })}
          />
        </Row>
      </Card>

      <Card className="settings-list">
        <h2>{t("st.notifications")}</h2>
        <Row title={t("st.alerts")} hint={t("st.alertsHint")}>
          <span className="switch">
            <input type="checkbox" checked={s.alertsEnabled} onChange={(e) => update({ alertsEnabled: e.target.checked })} />
            <i />
          </span>
        </Row>
      </Card>

      <Card className="settings-list">
        <h2>{t("st.data")}</h2>
        <Link className="setting-row" href="/setup" style={{ textDecoration: "none", color: "inherit" }}>
          <span>
            <b>{t("st.updateBill")}</b>
            <small>{t("st.updateBillHint")}</small>
          </span>
          <i>{lang === "ur" ? "‹" : "›"}</i>
        </Link>
        <Notice>
          {tariffs.verified ? t("st.verified") : t("st.unverified")} {t("common.legal")}
        </Notice>
      </Card>

      <button
        className="logout"
        onClick={async () => {
          if (!confirmReset) return setConfirmReset(true);
          await reset();
          setConfirmReset(false);
          setStatus(t("st.deleted"));
        }}
        onBlur={() => setConfirmReset(false)}
      >
        {confirmReset ? t("st.confirmDelete") : t("st.delete")}
      </button>
    </>
  );
}
