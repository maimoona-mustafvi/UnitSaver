"use client";

import { useState } from "react";
import { appliancePeriod, billStatus, calculateBill, co2Kg, protectedStatus } from "@/lib/billing";
import { daysBetween, todayISO } from "@/lib/dates";
import { useData } from "./DataProvider";
import { useTips } from "./useTips";
import { AIBadge, Card, Notice, rs } from "./ui";

const CYCLE_DAYS = 30;
const units = (n: number) => (n < 100 ? n.toFixed(1) : Math.round(n).toLocaleString("en-PK"));

/** Bill so far from the appliance list after N days, and the whole-month bill if usage continues, with Gemini tips. */
export function PeriodEstimate() {
  const { data, summary } = useData();
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
          <h2>Your bill so far</h2>
          <p className="subtle">From your appliances below. Set how many days have passed since your last bill.</p>
        </div>
        <label className="period-days">
          Days since last bill
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
          <p>So far · {p.daysSoFar} days</p>
          <h3>{units(p.unitsSoFar)} units</h3>
          <strong>{rs(soFar.payable)}</strong>
          <small>if the bill were made today</small>
        </div>
        <div className="period-box month">
          <p>
            Whole month · {CYCLE_DAYS} days {p.daysLeft > 0 && `(+${p.daysLeft} more)`}
          </p>
          <h3>{units(p.monthUnits)} units</h3>
          <strong>{rs(month.payable)}</strong>
          <small>≈ {Math.round(co2Kg(p.monthUnits))} kg CO₂ this month</small>
          <small>
            if usage continues · <span className="estimated-tag">Estimated</span>
          </small>
        </div>
      </div>
      {protectedNow && p.monthUnits > 200 && (
        <Notice tone="error">At this pace you&apos;ll pass 200 units and lose protected status for 6 months.</Notice>
      )}
      <div className="result-title" style={{ marginTop: 18 }}>
        <h3>How to bring it down</h3>
        {tips.result?.source === "ai" && <AIBadge title="Written by Gemini from your appliance usage" />}
      </div>
      {tips.loading && <p className="subtle" role="status">Gemini is looking at your usage…</p>}
      {tips.error && <p className="subtle">Couldn&apos;t load tips right now.</p>}
      {tips.result?.tips.map((t, i) => (
        <div className="tip-row" key={t}>
          <i aria-hidden>{["⌁", "≈", "□"][i % 3]}</i>
          <span>{t}</span>
          <b aria-hidden>→</b>
        </div>
      ))}
    </Card>
  );
}
