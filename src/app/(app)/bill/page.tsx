"use client";

import { useState } from "react";
import tariffs from "@/config/tariffs.json";
import { useData } from "@/components/DataProvider";
import { SetupPrompt } from "@/components/SetupPrompt";
import { C, Card, Loading, num, rs } from "@/components/ui";
import { monthLabel } from "@/lib/dates";

const pct = (n: number) => `${+(n * 100).toFixed(2)}%`;
const rate = (n: number) => `Rs ${+n.toFixed(4)}`;

export default function BillPage() {
  const { loading, summary, data } = useData();
  const [view, setView] = useState<"estimate" | "last">("estimate");
  const [details, setDetails] = useState(false);
  if (loading) return <Loading />;
  if (!summary || !data) return <SetupPrompt title="No bill to break down yet" />;

  const showEstimate = view === "estimate" && summary.hasReading;
  const bill = showEstimate ? summary.estimate : summary.lastBill;
  const month = showEstimate ? summary.currentMonth : data.lastBill!.month;
  const taxes = bill.ed + bill.gst + bill.tvFee + bill.incomeTax;

  const charges = [
    {
      title: "IESCO Charges",
      color: C.pale,
      total: bill.base,
      rows: [
        ["Cost of electricity", bill.energy, bill.energyLines.map((l) => `${num(l.units)} × ${rate(l.rate)}`).join(" + ") || "0 units"],
        ["Fixed charges", bill.fixed, bill.status === "protected" ? "Protected slab" : "Per NEPRA schedule"],
        ["F.C. surcharge", bill.fcSurcharge, `${num(bill.units)} × ${rate(tariffs.fcSurchargePerUnit)}`],
        ["Quarterly adjustment", bill.qtr, `${num(bill.units)} × ${rate(tariffs.qtrPerUnit)}`],
      ],
    },
    {
      title: "Government Taxes",
      color: C.pink,
      total: taxes,
      rows: [
        ["Electricity duty", bill.ed, `${pct(tariffs.edPct)} of electricity cost + QTR`],
        ["GST", bill.gst, `${pct(tariffs.gstPct)} of IESCO charges + duty`],
        ["TV fee", bill.tvFee, "Flat fee"],
        ...(bill.incomeTax ? [["Income tax", bill.incomeTax, `${pct(tariffs.incomeTax.nonFilerPct)} for non-filers above ${rs(tariffs.incomeTax.billThreshold)}`]] : []),
      ] as [string, number, string][],
    },
    {
      title: "Fuel Price Adjustment",
      color: C.mint,
      total: bill.fpaTotal,
      rows: [
        ["FPA amount", bill.fpa, `${num(bill.fpaReferenceUnits)} units (from an earlier month) × ${rate(tariffs.fpaPerUnit)}`],
        ["Taxes on FPA", bill.fpaTaxes, "Duty + GST on the FPA"],
      ],
    },
  ] as { title: string; color: string; total: number; rows: [string, number, string][] }[];

  return (
    <>
      <div className="history-toolbar">
        {summary.hasReading ? (
          <div className="segmented compact" role="tablist">
            <button role="tab" aria-selected={view === "estimate"} className={view === "estimate" ? "selected" : ""} onClick={() => setView("estimate")}>
              This month
            </button>
            <button role="tab" aria-selected={view === "last"} className={view === "last" ? "selected" : ""} onClick={() => setView("last")}>
              Last bill
            </button>
          </div>
        ) : (
          <span />
        )}
        <span style={{ fontSize: 13, fontWeight: 700 }}>{monthLabel(month, true)}</span>
      </div>
      <div className="summary-chips">
        <span>{num(bill.units)} units</span>
        <span className={bill.status === "protected" ? "" : "danger"}>{bill.status === "protected" ? "Protected" : "Non-protected"}</span>
        <span>{data.settings.meterType === "tou" ? "TOU meter" : "Normal meter"}</span>
        {showEstimate && <span>Projected at month-end pace</span>}
      </div>
      <Card className="total-card">
        <div>
          <p>Payable within due date</p>
          <h2>{rs(bill.payable)}</h2>
        </div>
        <div>
          <span>After due date (+{rs(bill.lps)})</span>
          <b>{rs(bill.latePayable)}</b>
        </div>
        <em>Estimated</em>
      </Card>
      <div className="breakdown-grid">
        {charges.map((c) => (
          <Card key={c.title} style={{ background: c.color }} className="charge-card">
            <div className="charge-title">
              <h3>{c.title}</h3>
              <b>{rs(c.total)}</b>
            </div>
            {c.rows.map(([label, amount, how]) => (
              <div className="charge-row" key={label}>
                <span>
                  {label}
                  {details && <small className="charge-how">{how}</small>}
                </span>
                <b>{rs(amount)}</b>
              </div>
            ))}
            <button onClick={() => setDetails((d) => !d)} aria-expanded={details}>
              {details ? "Hide details ↑" : "View details ↓"}
            </button>
          </Card>
        ))}
      </div>
      <div className="calculation-note">
        <b>i</b>
        <span>
          {bill.status === "protected"
            ? "Protected: each slab's units are charged at that slab's rate."
            : `Non-protected: all ${num(bill.units)} units at the ${rate(bill.energyLines[0]?.rate ?? 0)} slab rate.`}{" "}
          Current bill {rs(bill.currentBill)} + FPA {rs(bill.fpaTotal)}.
        </span>
      </div>
      <p className="legal-note">Estimate based on current NEPRA tariffs. Actual bill may vary.</p>
    </>
  );
}
