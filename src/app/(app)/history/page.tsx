"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "@/components/DataProvider";
import { useI18n } from "@/components/LanguageProvider";
import { SetupPrompt } from "@/components/SetupPrompt";
import { C, Card, Loading, num } from "@/components/ui";
import { billStatus, calculateBill, co2Kg } from "@/lib/billing";
import { addMonths } from "@/lib/dates";

export default function HistoryPage() {
  const { loading, summary, data } = useData();
  const { t, rs, month, date, lang } = useI18n();
  const [mode, setMode] = useState<"units" | "rupees">("units");
  if (loading) return <Loading />;
  if (!summary || !data) return <SetupPrompt title="sp.noHistory" />;

  const rtl = lang === "ur";
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
    return { ...h, label: month(h.month), rupees: bill.payable, value: mode === "units" ? h.units : bill.payable };
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
      .map((r) => ({
        date: r.date,
        reading: r.reading,
        units: r.units,
        bill: calculateBill({ units: r.units, status: billStatus(all, r.units), isFiler: data.settings.isFiler }).payable,
        soFar: true,
      })),
    { date: lb.readingDate, reading: lb.presentReading, units: summary.lastBillUnits, bill: summary.lastBill.payable, soFar: false },
  ];

  function downloadCsv() {
    const csv = [
      "date,reading,units,estimated_bill_rs",
      ...table.map((r) => `${r.date},${r.reading},${r.units},${r.bill}`),
      "",
      "month,units",
      ...all.map((h) => `${h.month},${h.units}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "unitsaver-history.csv" }).click();
    URL.revokeObjectURL(url);
  }

  const cols = { date: t("hi.date"), reading: t("hi.reading"), units: t("hi.units"), bill: t("hi.bill") };

  return (
    <>
      <div className="history-toolbar">
        <div className="segmented compact" role="tablist">
          <button role="tab" aria-selected={mode === "units"} className={mode === "units" ? "selected" : ""} onClick={() => setMode("units")}>
            {t("hi.units")}
          </button>
          <button role="tab" aria-selected={mode === "rupees"} className={mode === "rupees" ? "selected" : ""} onClick={() => setMode("rupees")}>
            {t("hi.rupees")}
          </button>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{t("hi.lastN", { n: months.length })}</span>
      </div>
      <Card className="chart-card">
        <div className="chart-head">
          <div>
            <p>{t("hi.usage")}</p>
            <h2>
              {mode === "units" ? t("common.unitsN", { n: num(total) }) : rs(rows.reduce((s, r) => s + r.rupees, 0))}{" "}
              <small>{t("hi.lastNSmall", { n: months.length })}</small>
            </h2>
          </div>
          {trend !== null && <span>{t("hi.trend", { arrow: trend <= 0 ? "↓" : "↑", n: Math.abs(trend) })}</span>}
        </div>
        {/* In Urdu the time axis runs right-to-left, like the text. */}
        <div style={{ height: 260, marginTop: 20 }} dir="ltr" role="img" aria-label={t("hi.chartLabel")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 10, right: rtl ? -10 : 0, left: rtl ? 0 : -10, bottom: 0 }}>
              <XAxis
                dataKey="label"
                reversed={rtl}
                tick={{ fill: "#fff", fontSize: 10 }}
                axisLine={{ stroke: "rgba(255,255,255,.3)" }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                orientation={rtl ? "right" : "left"}
                tick={{ fill: "#fff", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={mode === "units" ? 40 : 56}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,.08)" }}
                formatter={(v) => (mode === "units" ? t("common.unitsN", { n: num(Number(v)) }) : rs(Number(v)))}
                labelFormatter={(_, p) => (p?.[0] ? month(p[0].payload.month, true) : "")}
                contentStyle={{ borderRadius: 12, border: 0, color: C.ink }}
              />
              {mode === "units" && (
                <ReferenceLine
                  y={200}
                  stroke="#fff"
                  strokeDasharray="4 4"
                  label={{ value: t("hi.limit"), fill: "#fff", fontSize: 10, position: rtl ? "insideTopLeft" : "insideTopRight" }}
                />
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
          <b>{t("hi.highest", { m: month(highest.month, true) })}</b>
          <p>{t("common.unitsN", { n: num(highest.units) })}</p>
        </Card>
        <Card style={{ background: C.mint }}>
          <span>♧</span>
          <b>{t("hi.co2")}</b>
          <p>{t("common.kg", { n: num(co2Kg(savedUnits)) })}</p>
        </Card>
        <Card style={{ background: lastOver ? C.pink : C.mint }}>
          <span>{lastOver ? "!" : "✓"}</span>
          <b>{lastOver ? t("hi.crossed", { m: month(lastOver.month, true) }) : t("hi.noneOver")}</b>
          <p>{lastOver ? t("hi.by", { n: num(lastOver.units - 200) }) : t("hi.great")}</p>
        </Card>
      </div>
      <Card className="readings-table">
        <div className="table-head">
          <h2>{t("hi.readings")}</h2>
          <button onClick={downloadCsv}>{t("hi.csv")}</button>
        </div>
        <div className="table-row" style={{ fontWeight: 700, opacity: 0.55 }} aria-hidden>
          <span>{cols.date}</span>
          <span>{cols.reading}</span>
          <span>{cols.units}</span>
          <span>{cols.bill}</span>
        </div>
        {table.map((r) => (
          <div className="table-row" key={`${r.date}-${r.reading}`}>
            <span data-label={cols.date}>{date(r.date)}</span>
            <span data-label={cols.reading}>{num(r.reading)}</span>
            <span data-label={cols.units}>
              {num(r.units)} {r.soFar && <small>{t("hi.soFar")}</small>}
            </span>
            <span data-label={cols.bill}>{rs(r.bill)}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
