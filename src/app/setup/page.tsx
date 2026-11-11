"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import { useData } from "@/components/DataProvider";
import { AIBadge, Button, Loading, Notice, StepBar, Unity } from "@/components/ui";
import { addMonths, monthLabel, monthOf, todayISO } from "@/lib/dates";
import { postImage } from "@/lib/image";
import type { BillResult } from "@/lib/schemas";
import type { LastBill, MeterType, MonthUnits } from "@/types";

type Phase = "idle" | "reading" | "review" | "error";
type Field = "billMonth" | "previousReading" | "presentReading" | "readingDate" | "meterType" | "history";

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
function toSave(form: Form, manual: boolean): { lastBill: LastBill; history: MonthUnits[] } | string {
  const present = int(form.presentReading);
  if (Number.isNaN(present)) return "Enter your last meter reading (whole number).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.readingDate) || form.readingDate > todayISO()) return "Enter a valid reading date (not in the future).";
  const billMonth = manual ? monthOf(form.readingDate) : form.billMonth;
  if (!/^\d{4}-\d{2}$/.test(billMonth)) return "Enter the bill month as YYYY-MM.";
  const rows = form.history.map((h, i) => ({
    month: manual ? addMonths(billMonth, i - form.history.length + 1) : h.month,
    units: h.units.trim() === "" ? null : int(h.units),
  }));
  if (rows.some((r) => Number.isNaN(r.units))) return "Monthly units must be whole numbers.";
  const lastUnits = rows[rows.length - 1].units;
  const previous = manual ? (lastUnits === null ? NaN : present - lastUnits) : int(form.previousReading);
  if (Number.isNaN(previous)) return manual ? `Enter units for ${monthLabel(billMonth)} (your last bill).` : "Enter the previous reading.";
  if (previous > present) return "The previous reading can't be higher than the present reading.";
  const history = rows.filter((r): r is MonthUnits => r.units !== null && r.month !== billMonth);
  history.push({ month: billMonth, units: present - previous });
  return { lastBill: { month: billMonth, previousReading: previous, presentReading: present, readingDate: form.readingDate }, history };
}

export default function SetupPage() {
  const router = useRouter();
  const { data, run, loadDemo, loading } = useData();
  const [manual, setManual] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [form, setForm] = useState<Form>(blankForm);
  const [ai, setAi] = useState<Set<Field>>(new Set());
  const [meta, setMeta] = useState<{ confidence?: string; tariff?: string | null }>({});
  const [error, setError] = useState("");
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
    setError("");
    try {
      const result = await postImage<BillResult>("/api/read-bill", file);
      const next = fromAI(result);
      setForm(next.form);
      setAi(next.ai);
      setMeta({ confidence: result.confidence, tariff: result.tariff });
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read it clearly. Try again or enter manually.");
      setPhase("error");
    }
  }

  function switchTab(toManual: boolean) {
    setManual(toManual);
    setError("");
    if (toManual) {
      setForm((f) => ({ ...f, history: f.history.slice(-6) }));
    } else if (phase !== "review") {
      setPhase("idle");
    }
  }

  async function save() {
    const out = toSave(form, manual);
    if (typeof out === "string") return setError(out);
    setSaving(true);
    setError("");
    try {
      await run((s) =>
        s.saveProfile({
          ...out,
          settings: { ...data!.settings, meterType: form.meterType, billingCycleDay: Number(form.readingDate.slice(8)) },
        }),
      );
      router.push("/reading");
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : e}`);
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

  const label = (text: string, field: Field) => (
    <span className="field-label">
      {text} {ai.has(field) && <AIBadge />}
    </span>
  );
  const showForm = manual || phase === "review";
  const recent = form.history.slice(-6);
  const maxUnits = Math.max(1, ...recent.map((h) => int(h.units) || 0));

  return (
    <div className="onboarding-page">
      <Link className="back-link" href={data?.lastBill ? "/dashboard" : "/"}>
        ← Back
      </Link>
      <div className="onboarding-layout">
        <aside className="onboarding-art">
          <div className="mini-bubble">Your data stays yours.</div>
          <Unity mood={phase === "review" ? "celebrate" : phase === "error" ? "worried" : "thinking"} size={180} />
        </aside>
        <main className="setup-card">
          <StepBar step={1} />
          <h1>Add last month&apos;s bill</h1>
          <p className="subtle">Upload a photo of your bill. We&apos;ll read your last meter reading and 12-month history.</p>
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={!manual} className={!manual ? "selected" : ""} onClick={() => switchTab(false)}>
              Upload Bill Photo
            </button>
            <button role="tab" aria-selected={manual} className={manual ? "selected" : ""} onClick={() => switchTab(true)}>
              Enter Manually
            </button>
          </div>

          {!manual && phase === "reading" && <Loading label="Reading your bill…" />}

          {!manual && (phase === "idle" || phase === "error") && (
            <>
              {phase === "error" && (
                <Notice tone="error">
                  {error}{" "}
                  <button className="link-button" onClick={() => switchTab(true)}>
                    Enter manually
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
                <b>{phase === "error" ? "Try another photo" : "Drop bill photo or click to upload"}</b>
                <small>JPG, PNG or PDF · max 10MB</small>
                <em>Take Photo</em>
              </label>
            </>
          )}

          {showForm && (
            <div className={manual ? "" : "result-preview"}>
              {!manual && (
                <div className="result-title" style={{ marginBottom: 14 }}>
                  <b>Bill read – please check</b>
                  <AIBadge />
                </div>
              )}
              {!manual && meta.confidence === "low" && <Notice>Low confidence – double-check every value.</Notice>}
              {!manual && meta.tariff && !/^A-?1/i.test(meta.tariff) && (
                <Notice>Tariff {meta.tariff} detected. UnitSaver estimates residential (A-1) bills only.</Notice>
              )}
              <div className="form-grid">
                {!manual && (
                  <label>
                    {label("Bill month", "billMonth")}
                    <input type="month" value={form.billMonth} onChange={(e) => set("billMonth", e.target.value)} />
                  </label>
                )}
                {!manual && (
                  <label>
                    {label("Previous reading", "previousReading")}
                    <input inputMode="numeric" value={form.previousReading} onChange={(e) => set("previousReading", e.target.value)} />
                  </label>
                )}
                <label>
                  {label(manual ? "Last meter reading" : "Present reading", "presentReading")}
                  <input inputMode="numeric" value={form.presentReading} placeholder="e.g. 51306" onChange={(e) => set("presentReading", e.target.value)} />
                </label>
                <label>
                  {label("Reading date", "readingDate")}
                  <input type="date" value={form.readingDate} max={todayISO()} onChange={(e) => set("readingDate", e.target.value)} />
                </label>
                <label>
                  {label("Meter type", "meterType")}
                  <select value={form.meterType} onChange={(e) => set("meterType", e.target.value as MeterType)}>
                    <option value="normal">Normal</option>
                    <option value="tou">TOU (peak / off-peak)</option>
                  </select>
                </label>
                <div className="full">
                  <span className="field-label" style={{ fontSize: 12, fontWeight: 700 }}>
                    {manual ? "Last 6 months' units" : "Monthly units"} {ai.has("history") && <AIBadge />}
                  </span>
                  <div className="unit-inputs">
                    {form.history.map((h, i) => {
                      const month = manual ? addMonths(monthOf(form.readingDate || todayISO()), i - form.history.length + 1) : h.month;
                      return (
                        <label key={i}>
                          <small>{monthLabel(month)}</small>
                          <input inputMode="numeric" aria-label={`Units for ${monthLabel(month, true)}`} value={h.units} onChange={(e) => setUnits(i, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                  {manual && <p className="form-hint">The last box is your last bill&apos;s month. Leave unknown months empty.</p>}
                </div>
              </div>
              {!manual && (
                <div className="mini-history" aria-hidden>
                  {recent.map((h) => (
                    <div key={h.month}>
                      <i style={{ height: `${((int(h.units) || 0) / maxUnits) * 70}px`, background: (int(h.units) || 0) > 200 ? "var(--pink)" : undefined }} />
                      <small>{monthLabel(h.month)}</small>
                    </div>
                  ))}
                </div>
              )}
              {!manual && (
                <button className="link-button" style={{ marginTop: 12 }} onClick={() => setPhase("idle")}>
                  Upload a different photo
                </button>
              )}
            </div>
          )}

          {error && phase !== "error" && <Notice tone="error">{error}</Notice>}
          {showForm && (
            <Button onClick={save} className="full-button" disabled={saving || loading}>
              {saving ? "Saving…" : "Continue →"}
            </Button>
          )}
          <button className="link-button demo-link" onClick={demo} disabled={saving || loading}>
            No bill handy? Load demo data
          </button>
          <p className="privacy">▣ Your bill stays private. Photos are not stored, and personal details are never read.</p>
        </main>
      </div>
    </div>
  );
}
