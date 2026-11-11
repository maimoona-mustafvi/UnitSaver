"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import { useData } from "@/components/DataProvider";
import { LanguageSwitch, useI18n } from "@/components/LanguageProvider";
import { AIBadge, Button, Loading, Notice, StepBar, Unity } from "@/components/ui";
import type { Key, Vars } from "@/i18n";
import { addMonths, monthOf, todayISO } from "@/lib/dates";
import { aiErrorKey, postImage } from "@/lib/image";
import type { BillResult } from "@/lib/schemas";
import type { LastBill, MeterType, MonthUnits } from "@/types";

type Phase = "idle" | "reading" | "review" | "error";
type Field = "billMonth" | "previousReading" | "presentReading" | "readingDate" | "meterType" | "history";
type Message = { key: Key; vars?: Vars };

interface Form {
  billMonth: string;
  previousReading: string;
  presentReading: string;
  readingDate: string;
  meterType: MeterType;
  history: { month: string; units: string }[];
}

const months = (end: string, n: number) => Array.from({ length: n }, (_, i) => addMonths(end, i - n + 1));

function blankForm(): Form {
  const today = todayISO();
  return {
    billMonth: monthOf(today),
    previousReading: "",
    presentReading: "",
    readingDate: today,
    meterType: "normal",
    history: months(monthOf(today), 6).map((month) => ({ month, units: "" })),
  };
}

function fromAI(r: BillResult): { form: Form; ai: Set<Field> } {
  const ai = new Set<Field>();
  const base = blankForm();
  const pick = <K extends Field>(k: K, v: string | null | undefined, fallback: string) => {
    if (v === null || v === undefined) return fallback;
    ai.add(k);
    return v;
  };
  const billMonth = pick("billMonth", r.billMonth, r.readingDate ? monthOf(r.readingDate) : base.billMonth);
  const billed = r.unitsBilled ?? (r.presentReading !== null && r.previousReading !== null ? r.presentReading - r.previousReading : null);
  const history = r.history.filter((h) => h.month < billMonth).map((h) => ({ month: h.month, units: String(h.units) }));
  if (history.length) ai.add("history");
  // Pad to at least the 6 months that decide protected status.
  const known = new Set(history.map((h) => h.month));
  for (const m of months(addMonths(billMonth, -1), 5)) if (!known.has(m)) history.push({ month: m, units: "" });
  history.sort((a, b) => a.month.localeCompare(b.month));
  history.push({ month: billMonth, units: billed === null ? "" : String(billed) });
  return {
    ai,
    form: {
      billMonth,
      previousReading: pick("previousReading", r.previousReading?.toString(), ""),
      presentReading: pick("presentReading", r.presentReading?.toString(), ""),
      readingDate: pick("readingDate", r.readingDate, base.readingDate),
      meterType: pick("meterType", r.meterType, "normal") as MeterType,
      history: history.slice(-12),
    },
  };
}

const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);

/** Turns the form into what we store, or an error message. Manual mode derives the bill month and previous reading. */
function toSave(form: Form, manual: boolean, month: (ym: string) => string): { lastBill: LastBill; history: MonthUnits[] } | Message {
  const present = int(form.presentReading);
  if (Number.isNaN(present)) return { key: "setup.err.present" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.readingDate) || form.readingDate > todayISO()) return { key: "setup.err.date" };
  const billMonth = manual ? monthOf(form.readingDate) : form.billMonth;
  if (!/^\d{4}-\d{2}$/.test(billMonth)) return { key: "setup.err.month" };
  const rows = form.history.map((h, i) => ({
    month: manual ? addMonths(billMonth, i - form.history.length + 1) : h.month,
    units: h.units.trim() === "" ? null : int(h.units),
  }));
  if (rows.some((r) => Number.isNaN(r.units))) return { key: "setup.err.units" };
  const lastUnits = rows[rows.length - 1].units;
  const previous = manual ? (lastUnits === null ? NaN : present - lastUnits) : int(form.previousReading);
  if (Number.isNaN(previous)) return manual ? { key: "setup.err.lastUnits", vars: { m: month(billMonth) } } : { key: "setup.err.prev" };
  if (previous > present) return { key: "setup.err.order" };
  const history = rows.filter((r): r is MonthUnits => r.units !== null && r.month !== billMonth);
  history.push({ month: billMonth, units: present - previous });
  return { lastBill: { month: billMonth, previousReading: previous, presentReading: present, readingDate: form.readingDate }, history };
}

export default function SetupPage() {
  const router = useRouter();
  const { data, run, loadDemo, loading } = useData();
  const { t, month } = useI18n();
  const [manual, setManual] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [form, setForm] = useState<Form>(blankForm);
  const [ai, setAi] = useState<Set<Field>>(new Set());
  const [meta, setMeta] = useState<{ confidence?: string; tariff?: string | null }>({});
  const [error, setError] = useState<Message | null>(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: Field, v: Form[Field]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setAi((s) => (s.has(k) ? new Set([...s].filter((x) => x !== k)) : s));
  };
  const setUnits = (i: number, units: string) =>
    set("history", form.history.map((h, j) => (j === i ? { ...h, units } : h)));

  async function readBill(file?: File) {
    if (!file) return;
    setPhase("reading");
    setError(null);
    try {
      const result = await postImage<BillResult>("/api/read-bill", file);
      const next = fromAI(result);
      setForm(next.form);
      setAi(next.ai);
      setMeta({ confidence: result.confidence, tariff: result.tariff });
      setPhase("review");
    } catch (e) {
      setError({ key: aiErrorKey(e) });
      setPhase("error");
    }
  }

  function switchTab(toManual: boolean) {
    setManual(toManual);
    setError(null);
    if (toManual) {
      setForm((f) => ({ ...f, history: f.history.slice(-6) }));
    } else if (phase !== "review") {
      setPhase("idle");
    }
  }

  async function save() {
    const out = toSave(form, manual, month);
    if ("key" in out) return setError(out);
    setSaving(true);
    setError(null);
    setSaveError("");
    try {
      await run((s) =>
        s.saveProfile({
          ...out,
          settings: { ...data!.settings, meterType: form.meterType, billingCycleDay: Number(form.readingDate.slice(8)) },
        }),
      );
      router.push("/reading");
    } catch (e) {
      setSaveError(t("common.couldntSave", { e: e instanceof Error ? e.message : String(e) }));
      setSaving(false);
    }
  }

  async function demo() {
    setSaving(true);
    await loadDemo();
    router.push("/dashboard");
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    readBill(e.dataTransfer.files[0]);
  };

  const label = (key: Key, field: Field) => (
    <span className="field-label">
      {t(key)} {ai.has(field) && <AIBadge />}
    </span>
  );
  const showForm = manual || phase === "review";
  const recent = form.history.slice(-6);
  const maxUnits = Math.max(1, ...recent.map((h) => int(h.units) || 0));
  const errorText = error ? t(error.key, error.vars) : "";

  return (
    <div className="onboarding-page">
      <div className="page-top">
        <Link className="back-link" href={data?.lastBill ? "/dashboard" : "/"}>
          {t("common.back")}
        </Link>
        <LanguageSwitch />
      </div>
      <div className="onboarding-layout">
        <aside className="onboarding-art">
          <div className="mini-bubble">{t("setup.bubble")}</div>
          <Unity mood={phase === "review" ? "celebrate" : phase === "error" ? "worried" : "thinking"} size={180} />
        </aside>
        <main className="setup-card">
          <StepBar step={1} />
          <h1>{t("setup.title")}</h1>
          <p className="subtle">{t("setup.subtitle")}</p>
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={!manual} className={!manual ? "selected" : ""} onClick={() => switchTab(false)}>
              {t("setup.tabUpload")}
            </button>
            <button role="tab" aria-selected={manual} className={manual ? "selected" : ""} onClick={() => switchTab(true)}>
              {t("setup.tabManual")}
            </button>
          </div>

          {!manual && phase === "reading" && <Loading label={t("setup.reading")} />}

          {!manual && (phase === "idle" || phase === "error") && (
            <>
              {phase === "error" && (
                <Notice tone="error">
                  {errorText}{" "}
                  <button className="link-button" onClick={() => switchTab(true)}>
                    {t("setup.enterManually")}
                  </button>
                </Notice>
              )}
              <label className="upload-zone" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    readBill(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <span aria-hidden>↑</span>
                <b>{phase === "error" ? t("setup.tryAnother") : t("setup.drop")}</b>
                <small>{t("setup.formats")}</small>
                <em>{t("setup.takePhoto")}</em>
              </label>
            </>
          )}

          {showForm && (
            <div className={manual ? "" : "result-preview"}>
              {!manual && (
                <div className="result-title" style={{ marginBottom: 14 }}>
                  <b>{t("setup.readCheck")}</b>
                  <AIBadge />
                </div>
              )}
              {!manual && meta.confidence === "low" && <Notice>{t("setup.lowConf")}</Notice>}
              {!manual && meta.tariff && !/^A-?1/i.test(meta.tariff) && <Notice>{t("setup.tariff", { t: meta.tariff })}</Notice>}
              <div className="form-grid">
                {!manual && (
                  <label>
                    {label("setup.billMonth", "billMonth")}
                    <input type="month" value={form.billMonth} onChange={(e) => set("billMonth", e.target.value)} />
                  </label>
                )}
                {!manual && (
                  <label>
                    {label("setup.prev", "previousReading")}
                    <input inputMode="numeric" value={form.previousReading} onChange={(e) => set("previousReading", e.target.value)} />
                  </label>
                )}
                <label>
                  {label(manual ? "setup.lastReading" : "setup.present", "presentReading")}
                  <input
                    inputMode="numeric"
                    value={form.presentReading}
                    placeholder={t("setup.placeholder")}
                    onChange={(e) => set("presentReading", e.target.value)}
                  />
                </label>
                <label>
                  {label("setup.date", "readingDate")}
                  <input type="date" value={form.readingDate} max={todayISO()} onChange={(e) => set("readingDate", e.target.value)} />
                </label>
                <label>
                  {label("setup.meterType", "meterType")}
                  <select value={form.meterType} onChange={(e) => set("meterType", e.target.value as MeterType)}>
                    <option value="normal">{t("meter.normal")}</option>
                    <option value="tou">{t("meter.tou")}</option>
                  </select>
                </label>
                <div className="full">
                  <span className="field-label" style={{ fontSize: 12, fontWeight: 700 }}>
                    {manual ? t("setup.last6") : t("setup.monthly")} {ai.has("history") && <AIBadge />}
                  </span>
                  <div className="unit-inputs">
                    {form.history.map((h, i) => {
                      const m = manual ? addMonths(monthOf(form.readingDate || todayISO()), i - form.history.length + 1) : h.month;
                      return (
                        <label key={i}>
                          <small>{month(m)}</small>
                          <input inputMode="numeric" aria-label={t("setup.unitsFor", { m: month(m, true) })} value={h.units} onChange={(e) => setUnits(i, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                  {manual && <p className="form-hint">{t("setup.hint")}</p>}
                </div>
              </div>
              {!manual && (
                <div className="mini-history" aria-hidden>
                  {recent.map((h) => (
                    <div key={h.month}>
                      <i style={{ height: `${((int(h.units) || 0) / maxUnits) * 70}px`, background: (int(h.units) || 0) > 200 ? "var(--pink)" : undefined }} />
                      <small>{month(h.month)}</small>
                    </div>
                  ))}
                </div>
              )}
              {!manual && (
                <button className="link-button" style={{ marginTop: 12 }} onClick={() => setPhase("idle")}>
                  {t("setup.different")}
                </button>
              )}
            </div>
          )}

          {error && phase !== "error" && <Notice tone="error">{errorText}</Notice>}
          {saveError && <Notice tone="error">{saveError}</Notice>}
          {showForm && (
            <Button onClick={save} className="full-button" disabled={saving || loading}>
              {saving ? t("common.saving") : t("setup.continue")}
            </Button>
          )}
          <button className="link-button demo-link" onClick={demo} disabled={saving || loading}>
            {t("setup.demo")}
          </button>
          <p className="privacy">{t("setup.privacy")}</p>
        </main>
      </div>
    </div>
  );
}
