"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "@/components/DataProvider";
import { SetupPrompt } from "@/components/SetupPrompt";
import { C, Card, Loading, num, rs } from "@/components/ui";
import { billStatus, calculateBill, co2Kg } from "@/lib/billing";
import { addMonths, formatDate, monthLabel } from "@/lib/dates";

export default function HistoryPage() {
  const { loading, summary, data } = useData();
  const [mode, setMode] = useState<"units" | "rupees">("units");
  if (loading) return <Loading />;
  if (!summary || !data) return <SetupPrompt title="No history yet" />;

  const all = summary.history;
  const months = all.slice(-12);
  const unitsIn = (m: string) => all.find((h) => h.month === m)?.units;
  const rows = months.map((h) => {
    const bill = calculateBill({
      units: h.units,
      status: billStatus(all.filter((x) => x.month < h.month), h.units),
      fpaReferenceUnits: unitsIn(addMonths(h.month, -2)) ?? h.units,
      isFiler: data.settings.isFiler,
    });
    return { ...h, label: monthLabel(h.month), rupees: bill.payable, value: mode === "units" ? h.units : bill.payable };
  });
  const total = months.reduce((s, h) => s + h.units, 0);
  const last6 = months.slice(-6).reduce((s, h) => s + h.units, 0);
  const prev6 = months.length >= 12 ? months.slice(0, 6).reduce((s, h) => s + h.units, 0) : 0;
  const trend = prev6 ? Math.round(((last6 - prev6) / prev6) * 100) : null;
  const highest = months.reduce((a, b) => (b.units > a.units ? b : a), months[0]);
  const lastOver = [...months].reverse().find((h) => h.units > 200);
  // CO2 avoided whenever a month used less than the month before it.
  const savedUnits = months.slice(1).reduce((s, h, i) => s + Math.max(0, months[i].units - h.units), 0);

  const lb = data.lastBill!;
  const table = [
    ...[...data.readings]
      .filter((r) => r.date >= lb.readingDate)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((r) => ({ date: r.date, reading: r.reading, units: r.units, bill: calculateBill({ units: r.units, status: billStatus(all, r.units), isFiler: data.settings.isFiler }).payable, note: "so far" })),
    { date: lb.readingDate, reading: lb.presentReading, units: summary.lastBillUnits, bill: summary.lastBill.payable, note: "bill" },
  ];

  function downloadCsv() {
    const csv = ["date,reading,units,estimated_bill_rs", ...table.map((r) => `${r.date},${r.reading},${r.units},${r.bill}`), "", "month,units", ...all.map((h) => `${h.month},${h.units}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "unitsaver-history.csv" }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="history-toolbar">
        <div className="segmented compact" role="tablist">
          <button role="tab" aria-selected={mode === "units"} className={mode === "units" ? "selected" : ""} onClick={() => setMode("units")}>
            Units
          </button>
          <button role="tab" aria-selected={mode === "rupees"} className={mode === "rupees" ? "selected" : ""} onClick={() => setMode("rupees")}>
            Rupees
          </button>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Last {months.length} months</span>
      </div>
      <Card className="chart-card">
        <div className="chart-head">
          <div>
            <p>Electricity usage</p>
            <h2>
              {mode === "units" ? `${num(total)} units` : rs(rows.reduce((s, r) => s + r.rupees, 0))} <small>last {months.length} months</small>
            </h2>
          </div>
          {trend !== null && (
            <span>
              {trend <= 0 ? "↓" : "↑"} {Math.abs(trend)}% vs previous 6 months
            </span>
          )}
        </div>
        <div style={{ height: 260, marginTop: 20 }} role="img" aria-label={`Bar chart of monthly ${mode}; months above 200 units are pink`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: "#fff", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,.3)" }} tickLine={false} interval={0} />
              <YAxis tick={{ fill: "#fff", fontSize: 10 }} axisLine={false} tickLine={false} width={mode === "units" ? 40 : 56} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,.08)" }}
                formatter={(v) => (mode === "units" ? `${num(Number(v))} units` : rs(Number(v)))}
                labelFormatter={(_, p) => (p?.[0] ? monthLabel(p[0].payload.month, true) : "")}
                contentStyle={{ borderRadius: 12, border: 0, color: C.ink }}
              />
              {mode === "units" && (
                <ReferenceLine y={200} stroke="#fff" strokeDasharray="4 4" label={{ value: "200 unit limit", fill: "#fff", fontSize: 10, position: "insideTopRight" }} />
              )}
              <Bar dataKey="value" radius={[7, 7, 0, 0]} maxBarSize={34} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.month} fill={r.units > 200 ? C.pink : C.lime} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="insight-grid">
        <Card style={{ background: C.pale }}>
          <span>↗</span>
          <b>{monthLabel(highest.month, true)} was your highest month</b>
          <p>{num(highest.units)} units</p>
        </Card>
        <Card style={{ background: C.mint }}>
          <span>♧</span>
          <b>CO₂ saved by cutting back</b>
          <p>{num(co2Kg(savedUnits))} kg</p>
        </Card>
        <Card style={{ background: lastOver ? C.pink : C.mint }}>
          <span>{lastOver ? "!" : "✓"}</span>
          <b>{lastOver ? `${monthLabel(lastOver.month, true)} crossed the limit` : "No month over 200"}</b>
          <p>{lastOver ? `by ${num(lastOver.units - 200)} units` : "Great job!"}</p>
        </Card>
      </div>
      <Card className="readings-table">
        <div className="table-head">
          <h2>Meter readings</h2>
          <button onClick={downloadCsv}>Download CSV ↓</button>
        </div>
        <div className="table-row" style={{ fontWeight: 700, opacity: 0.55 }} aria-hidden>
          <span>Date</span>
          <span>Reading</span>
          <span>Units</span>
          <span>Est. bill</span>
        </div>
        {table.map((r) => (
          <div className="table-row" key={`${r.date}-${r.reading}`}>
            <span data-label="Date">{formatDate(r.date)}</span>
            <span data-label="Reading">{num(r.reading)}</span>
            <span data-label="Units">
              {num(r.units)} {r.note === "so far" && <small>(so far)</small>}
            </span>
            <span data-label="Est. bill">{rs(r.bill)}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
