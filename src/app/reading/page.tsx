"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { AIBadge, Button, Card, Loading, Notice, StepBar, Unity, num } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { postImage } from "@/lib/image";
import type { MeterResult } from "@/lib/schemas";

type Phase = "idle" | "reading" | "done" | "error";

export default function ReadingPage() {
  const router = useRouter();
  const { data, run, loading, summary } = useData();
  const [phase, setPhase] = useState<Phase>("idle");
  const [value, setValue] = useState("");
  const [fromAI, setFromAI] = useState(false);
  const [editing, setEditing] = useState(false);
  const [meta, setMeta] = useState<Pick<MeterResult, "confidence" | "notes">>();
  const [date, setDate] = useState(todayISO);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading />;
  const lastBill = data?.lastBill;
  if (!lastBill)
    return (
      <div className="simple-page">
        <div className="empty-state">
          <Unity mood="thinking" size={100} />
          <h2>First, add last month&apos;s bill</h2>
          <p>We need your last meter reading to count this month&apos;s units.</p>
          <Button href="/setup">Add my bill →</Button>
        </div>
      </div>
    );

  const last = lastBill.presentReading;
  const reading = /^\d+$/.test(value) ? Number(value) : null;
  const units = reading === null ? null : reading - last;
  const invalid = units !== null && units < 0;

  async function readMeter(file?: File) {
    if (!file) return;
    setPhase("reading");
    setError("");
    try {
      const r = await postImage<MeterResult>("/api/read-meter", file);
      setMeta({ confidence: r.confidence, notes: r.notes });
      if (r.reading === null) throw new Error("We couldn't read the digits clearly. Try again or enter manually.");
      setValue(String(r.reading));
      setFromAI(true);
      setEditing(r.confidence === "low");
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read it clearly. Try again or enter manually.");
      setEditing(true);
      setPhase("error");
    }
  }

  async function save() {
    if (reading === null || units === null || invalid) return setError("Enter a reading equal to or above your last reading.");
    if (date < lastBill!.readingDate || date > todayISO()) return setError("The reading date must be between your last bill's reading and today.");
    setSaving(true);
    try {
      await run((s) => s.addReading({ reading, date, units, source: fromAI ? "ai" : "manual" }));
      router.push("/dashboard");
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : e}`);
      setSaving(false);
    }
  }

  return (
    <div className="simple-page">
      <Link className="back-link" href={summary?.hasReading ? "/dashboard" : "/setup"}>
        ← Back
      </Link>
      <div className="reading-head">
        <StepBar step={2} />
        <h1>Snap your meter</h1>
        <p className="subtle">We&apos;ll calculate exactly how many units you&apos;ve used.</p>
      </div>
      <div className="reading-grid">
        <label className="meter-upload">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={phase === "reading"}
            onChange={(e) => {
              readMeter(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {phase === "reading" ? (
            <Loading label="Reading your meter…" />
          ) : (
            <>
              {phase === "done" ? <Unity mood="celebrate" size={100} /> : <span className="camera-icon" aria-hidden>◉</span>}
              <h3>{phase === "done" ? "Meter read!" : "Upload or take a photo of your meter"}</h3>
              <p>Make sure digits are clear and well lit.</p>
              <em>{phase === "idle" ? "Choose photo" : "Try another photo"}</em>
            </>
          )}
        </label>
        <Card className="reading-result">
          <div className="result-title">
            <span>{fromAI ? "Detected reading" : "Current reading"}</span>
            {fromAI && <AIBadge />}
          </div>
          {phase === "error" && <Notice tone="error">{error} You can type the reading below.</Notice>}
          {fromAI && meta?.confidence === "low" && <Notice>Low confidence{meta.notes ? `: ${meta.notes}` : ""} – please check the number.</Notice>}
          <div className="big-reading">
            {editing || !value ? (
              <input
                inputMode="numeric"
                aria-label="Current meter reading"
                placeholder="— — — — —"
                value={value}
                autoFocus={editing}
                onChange={(e) => {
                  setValue(e.target.value.replace(/\D/g, ""));
                  setFromAI(false);
                  setEditing(true);
                }}
              />
            ) : (
              <>
                {value}{" "}
                <button onClick={() => setEditing(true)} type="button">
                  Edit
                </button>
              </>
            )}
          </div>
          <div className="form-grid" style={{ marginBottom: 18 }}>
            <label className="full">
              Reading date
              <input type="date" value={date} min={lastBill.readingDate} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          <div className="calculation" aria-live="polite">
            <span>{reading === null ? "—" : num(reading)}</span>
            <b>−</b>
            <span>{num(last)}</span>
            <b>=</b>
            <strong>{units === null ? "—" : `${num(units)} units`}</strong>
          </div>
          {invalid && <Notice tone="error">That&apos;s lower than your last reading ({num(last)}). Please check it.</Notice>}
          {error && phase !== "error" && <Notice tone="error">{error}</Notice>}
          <Button variant="lime" onClick={save} className="full-button" disabled={saving || units === null || invalid}>
            {saving ? "Saving…" : "Calculate My Bill →"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
