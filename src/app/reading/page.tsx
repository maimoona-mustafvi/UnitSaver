"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { LanguageSwitch, useI18n } from "@/components/LanguageProvider";
import { AIBadge, Button, Card, Loading, Notice, StepBar, Unity, num } from "@/components/ui";
import type { Key } from "@/i18n";
import { todayISO } from "@/lib/dates";
import { aiErrorKey, postImage } from "@/lib/image";
import type { MeterResult } from "@/lib/schemas";

type Phase = "idle" | "reading" | "done" | "error";

export default function ReadingPage() {
  const router = useRouter();
  const { data, run, loading, summary } = useData();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [value, setValue] = useState("");
  const [fromAI, setFromAI] = useState(false);
  const [editing, setEditing] = useState(false);
  const [meta, setMeta] = useState<Pick<MeterResult, "confidence" | "notes">>();
  const [date, setDate] = useState(todayISO);
  const [error, setError] = useState<Key | null>(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading />;
  const lastBill = data?.lastBill;
  if (!lastBill)
    return (
      <div className="simple-page">
        <div className="empty-state">
          <Unity mood="thinking" size={100} />
          <h2>{t("rd.needBill")}</h2>
          <p>{t("rd.needBillText")}</p>
          <Button href="/setup">{t("common.addMyBill")}</Button>
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
    setError(null);
    try {
      const r = await postImage<MeterResult>("/api/read-meter", file);
      setMeta({ confidence: r.confidence, notes: r.notes });
      if (r.reading === null) {
        setError("rd.err.digits");
        setEditing(true);
        setPhase("error");
        return;
      }
      setValue(String(r.reading));
      setFromAI(true);
      setEditing(r.confidence === "low");
      setPhase("done");
    } catch (e) {
      setError(aiErrorKey(e));
      setEditing(true);
      setPhase("error");
    }
  }

  async function save() {
    if (reading === null || units === null || invalid) return setError("rd.err.min");
    if (date < lastBill!.readingDate || date > todayISO()) return setError("rd.err.date");
    setSaving(true);
    try {
      await run((s) => s.addReading({ reading, date, units, source: fromAI ? "ai" : "manual" }));
      router.push("/dashboard");
    } catch (e) {
      setSaveError(t("common.couldntSave", { e: e instanceof Error ? e.message : String(e) }));
      setSaving(false);
    }
  }

  return (
    <div className="simple-page">
      <div className="page-top">
        <Link className="back-link" href={summary?.hasReading ? "/dashboard" : "/setup"}>
          {t("common.back")}
        </Link>
        <LanguageSwitch />
      </div>
      <div className="reading-head">
        <StepBar step={2} />
        <h1>{t("rd.title")}</h1>
        <p className="subtle">{t("rd.subtitle")}</p>
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
            <Loading label={t("rd.reading")} />
          ) : (
            <>
              {phase === "done" ? <Unity mood="celebrate" size={100} /> : <span className="camera-icon" aria-hidden>◉</span>}
              <h3>{phase === "done" ? t("rd.read") : t("rd.upload")}</h3>
              <p>{t("rd.clear")}</p>
              <em>{phase === "idle" ? t("rd.choose") : t("rd.another")}</em>
            </>
          )}
        </label>
        <Card className="reading-result">
          <div className="result-title">
            <span>{fromAI ? t("rd.detected") : t("rd.current")}</span>
            {fromAI && <AIBadge />}
          </div>
          {phase === "error" && error && (
            <Notice tone="error">
              {t(error)} {t("rd.typeBelow")}
            </Notice>
          )}
          {fromAI && meta?.confidence === "low" && (
            <Notice>
              {t("rd.lowConf")}
              {meta.notes ? ` (${meta.notes})` : ""}
            </Notice>
          )}
          <div className="big-reading">
            {editing || !value ? (
              <input
                inputMode="numeric"
                dir="ltr"
                aria-label={t("rd.inputLabel")}
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
                <span dir="ltr">{value}</span>{" "}
                <button onClick={() => setEditing(true)} type="button">
                  {t("rd.edit")}
                </button>
              </>
            )}
          </div>
          <div className="form-grid" style={{ marginBottom: 18 }}>
            <label className="full">
              {t("rd.date")}
              <input type="date" value={date} min={lastBill.readingDate} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          {/* Arithmetic always reads left to right, in both languages. */}
          <div className="calculation" dir="ltr" aria-live="polite">
            <span>{reading === null ? "—" : num(reading)}</span>
            <b>−</b>
            <span>{num(last)}</span>
            <b>=</b>
            <strong>{units === null ? "—" : t("common.unitsN", { n: num(units) })}</strong>
          </div>
          {invalid && <Notice tone="error">{t("rd.lower", { n: num(last) })}</Notice>}
          {error && phase !== "error" && <Notice tone="error">{t(error)}</Notice>}
          {saveError && <Notice tone="error">{saveError}</Notice>}
          <Button variant="lime" onClick={save} className="full-button" disabled={saving || units === null || invalid}>
            {saving ? t("common.saving") : t("rd.calc")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
