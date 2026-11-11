"use client";

import { useState } from "react";
import { appliancePeriod, billStatus, calculateBill, co2Kg, protectedStatus } from "@/lib/billing";
import { daysBetween, todayISO } from "@/lib/dates";
import { useData } from "./DataProvider";
import { useI18n } from "./LanguageProvider";
import { useTips } from "./useTips";
import { AIBadge, Card, Notice } from "./ui";

const CYCLE_DAYS = 30;
const units = (n: number) => (n < 100 ? n.toFixed(1) : Math.round(n).toLocaleString("en-PK"));

/** Bill so far from the appliance list after N days, and the whole-month bill if usage continues, with Gemini tips. */
export function PeriodEstimate() {
  const { data, summary } = useData();
  const { t, rs } = useI18n();
  const lastBill = data?.lastBill;
  const defaultDays = lastBill ? Math.min(CYCLE_DAYS, Math.max(1, daysBetween(lastBill.readingDate, todayISO()))) : 15;
  const [days, setDays] = useState<number | null>(null);
  const [input, setInput] = useState<string | null>(null);

  const d = days ?? defaultDays;
  const appliances = data?.appliances ?? [];
  const history = data?.history ?? [];
  const p = appliancePeriod(appliances, d, CYCLE_DAYS);
  // FPA is charged on an earlier month's units; use the metered cycle's reference month when we have it.
  const fpaRef = summary?.estimate.fpaReferenceUnits;
  const bill = (u: number) =>
    calculateBill({ units: u, status: billStatus(history, u), fpaReferenceUnits: fpaRef ?? u, isFiler: data?.settings.isFiler });
  const soFar = bill(p.unitsSoFar);
  const month = bill(p.monthUnits);
  const protectedNow = protectedStatus(history).isProtected;

  // Gemini writes tips for the projection; the numbers themselves come from calculateBill above.
  const tips = useTips(
    data && appliances.length
      ? {
          unitsSoFar: Math.round(p.unitsSoFar * 10) / 10,
          daysLeft: p.daysLeft,
          predictedUnits: Math.round(p.monthUnits * 10) / 10,
          status: protectedNow ? "protected" : "nonProtected",
          meterType: data.settings.meterType,
          appliances: appliances.map(({ name, watts, quantity, hoursPerDay, daysPerWeek }) => ({ name, watts, quantity, hoursPerDay, daysPerWeek })),
        }
      : null,
  );

  const commit = () => {
    if (input === null) return;
    const n = Math.round(Number(input));
    if (n >= 1 && n <= CYCLE_DAYS) setDays(n);
    setInput(null);
  };

  return (
    <Card className="period-card">
      <div className="period-head">
        <div>
          <h2>{t("pe.title")}</h2>
          <p className="subtle">{t("pe.lead")}</p>
        </div>
        <label className="period-days">
          {t("pe.days")}
          <input
            type="number"
            min={1}
            max={CYCLE_DAYS}
            value={input ?? d}
            onChange={(e) => setInput(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
        </label>
      </div>
      <div className="period-grid">
        <div className="period-box now">
          <p>{t("pe.soFar", { n: p.daysSoFar })}</p>
          <h3>{t("common.unitsN", { n: units(p.unitsSoFar) })}</h3>
          <strong>{rs(soFar.payable)}</strong>
          <small>{t("pe.today")}</small>
        </div>
        <div className="period-box month">
          <p>
            {t("pe.month", { n: CYCLE_DAYS })} {p.daysLeft > 0 && t("pe.more", { n: p.daysLeft })}
          </p>
          <h3>{t("common.unitsN", { n: units(p.monthUnits) })}</h3>
          <strong>{rs(month.payable)}</strong>
          <small>{t("pe.co2", { kg: Math.round(co2Kg(p.monthUnits)) })}</small>
          <small>
            {t("pe.continues")} · <span className="estimated-tag">{t("common.estimated")}</span>
          </small>
        </div>
      </div>
      {protectedNow && p.monthUnits > 200 && <Notice tone="error">{t("pe.warn")}</Notice>}
      <div className="result-title" style={{ marginTop: 18 }}>
        <h3>{t("pe.how")}</h3>
        {tips.result?.source === "ai" && <AIBadge title={t("pe.aiTitle")} />}
      </div>
      {tips.loading && (
        <p className="subtle" role="status">
          {t("pe.loading")}
        </p>
      )}
      {tips.error && <p className="subtle">{t("pe.error")}</p>}
      {tips.result?.tips.map((tip, i) => (
        <div className="tip-row" key={tip}>
          <i aria-hidden>{["⌁", "≈", "□"][i % 3]}</i>
          <span>{tip}</span>
          <b aria-hidden>{t("common.arrow")}</b>
        </div>
      ))}
    </Card>
  );
}
