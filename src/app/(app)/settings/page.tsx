"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import tariffs from "@/config/tariffs.json";
import { useData } from "@/components/DataProvider";
import { Card, Loading, Notice } from "@/components/ui";
import type { Settings } from "@/types";

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
  const { loading, data, store, run, loadDemo, reset } = useData();
  const [status, setStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  if (loading || !data) return <Loading />;
  const s = data.settings;

  async function update(patch: Partial<Settings>) {
    setStatus("Saving…");
    try {
      await run((st) => st.saveProfile({ settings: { ...s, ...patch } }));
      setStatus("Saved");
    } catch (e) {
      setStatus(`Couldn't save: ${e instanceof Error ? e.message : e}`);
    }
  }
  const clampInt = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

  return (
    <>
      <Card className="profile-banner">
        <div className="profile-photo">ME</div>
        <div>
          <h2>Your household</h2>
          <p>{store?.mode === "firebase" ? "Anonymous account · synced with Firebase" : "Saved on this device only"}</p>
          <b>{s.company} customer</b>
        </div>
        <button onClick={() => loadDemo().then(() => setStatus("Demo data loaded"))}>Load demo data</button>
      </Card>
      {status && (
        <p className="subtle" role="status" style={{ marginTop: 12 }}>
          {status}
        </p>
      )}

      <Card className="settings-list">
        <h2>Bill preferences</h2>
        <Row title="Electricity company" hint="Uniform national tariff is used for all DISCOs">
          <select className="setting-control" value={s.company} onChange={(e) => update({ company: e.target.value })}>
            {COMPANIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Row>
        <Row title="Meter type" hint="TOU meters get peak-hour tips">
          <select className="setting-control" value={s.meterType} onChange={(e) => update({ meterType: e.target.value as Settings["meterType"] })}>
            <option value="normal">Normal</option>
            <option value="tou">TOU</option>
          </select>
        </Row>
        <Row title="Billing cycle date" hint="Day of the month your meter is read">
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
        <Row title="Tax filer status" hint="Non-filers pay income tax on large bills">
          <select className="setting-control" value={s.isFiler ? "filer" : "non"} onChange={(e) => update({ isFiler: e.target.value === "filer" })}>
            <option value="filer">Filer</option>
            <option value="non">Non-filer</option>
          </select>
        </Row>
        <Row title="Alert threshold" hint="Warn me when units reach this number">
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
        <h2>Notifications</h2>
        <Row title="Usage alerts" hint="Show the near-200 alert">
          <span className="switch">
            <input type="checkbox" checked={s.alertsEnabled} onChange={(e) => update({ alertsEnabled: e.target.checked })} />
            <i />
          </span>
        </Row>
      </Card>

      <Card className="settings-list">
        <h2>Your data</h2>
        <Link className="setting-row" href="/setup" style={{ textDecoration: "none", color: "inherit" }}>
          <span>
            <b>Update last bill</b>
            <small>Re-upload or edit your bill and history</small>
          </span>
          <i>›</i>
        </Link>
        <Notice>
          {tariffs.verified ? "Tariffs verified against NEPRA." : "Tariff rates are prototype values – verify against the latest NEPRA notification."} Estimate based on current NEPRA
          tariffs. Actual bill may vary.
        </Notice>
      </Card>

      <button
        className="logout"
        onClick={async () => {
          if (!confirmReset) return setConfirmReset(true);
          await reset();
          setConfirmReset(false);
          setStatus("All data deleted");
        }}
        onBlur={() => setConfirmReset(false)}
      >
        {confirmReset ? "Tap again to delete everything" : "Delete my data"}
      </button>
    </>
  );
}
