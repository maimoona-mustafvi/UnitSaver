"use client";

import { useState } from "react";
import tariffs from "@/config/tariffs.json";
import { useData } from "@/components/DataProvider";
import { useI18n } from "@/components/LanguageProvider";
import { SetupPrompt } from "@/components/SetupPrompt";
import { C, Card, Loading, num } from "@/components/ui";
import type { Key } from "@/i18n";

const pct = (n: number) => `${+(n * 100).toFixed(2)}%`;

type Row = [Key, number, string];

export default function BillPage() {
  const { loading, summary, data } = useData();
  const { t, rs, month } = useI18n();
  const [view, setView] = useState<"estimate" | "last">("estimate");
  const [details, setDetails] = useState(false);
  if (loading) return <Loading />;
  if (!summary || !data) return <SetupPrompt title="sp.noBill" />;

  const rate = (n: number) => t("common.rs", { n: +n.toFixed(4) });
  const showEstimate = view === "estimate" && summary.hasReading;
  const bill = showEstimate ? summary.estimate : summary.lastBill;
  const billMonth = showEstimate ? summary.currentMonth : data.lastBill!.month;
  const taxes = bill.ed + bill.gst + bill.tvFee + bill.incomeTax;

  const charges: { title: Key; color: string; total: number; rows: Row[] }[] = [
    {
      title: "bill.iesco",
      color: C.pale,
      total: bill.base,
      rows: [
        ["bill.energy", bill.energy, bill.energyLines.map((l) => `${num(l.units)} × ${rate(l.rate)}`).join(" + ") || t("bill.how.zero")],
        ["bill.fixed", bill.fixed, bill.status === "protected" ? t("bill.how.protectedSlab") : t("bill.how.schedule")],
        ["bill.fc", bill.fcSurcharge, `${num(bill.units)} × ${rate(tariffs.fcSurchargePerUnit)}`],
        ["bill.qtr", bill.qtr, `${num(bill.units)} × ${rate(tariffs.qtrPerUnit)}`],
      ],
    },
    {
      title: "bill.govt",
      color: C.pink,
      total: taxes,
      rows: [
        ["bill.ed", bill.ed, t("bill.how.ed", { p: pct(tariffs.edPct) })],
        ["bill.gst", bill.gst, t("bill.how.gst", { p: pct(tariffs.gstPct) })],
        ["bill.tv", bill.tvFee, t("bill.how.flat")],
        ...(bill.incomeTax
          ? ([["bill.incomeTax", bill.incomeTax, t("bill.how.income", { p: pct(tariffs.incomeTax.nonFilerPct), rs: rs(tariffs.incomeTax.billThreshold) })]] as Row[])
          : []),
      ],
    },
    {
      title: "bill.fpa",
      color: C.mint,
      total: bill.fpaTotal,
      rows: [
        ["bill.fpaAmount", bill.fpa, t("bill.how.fpa", { n: num(bill.fpaReferenceUnits), r: rate(tariffs.fpaPerUnit) })],
        ["bill.fpaTaxes", bill.fpaTaxes, t("bill.how.fpaTax")],
      ],
    },
  ];

  return (
    <>
      <div className="history-toolbar">
        {summary.hasReading ? (
          <div className="segmented compact" role="tablist">
            <button role="tab" aria-selected={view === "estimate"} className={view === "estimate" ? "selected" : ""} onClick={() => setView("estimate")}>
              {t("bill.thisMonth")}
            </button>
            <button role="tab" aria-selected={view === "last"} className={view === "last" ? "selected" : ""} onClick={() => setView("last")}>
              {t("bill.last")}
            </button>
          </div>
        ) : (
          <span />
        )}
        <span style={{ fontSize: 13, fontWeight: 700 }}>{month(billMonth, true)}</span>
      </div>
      <div className="summary-chips">
        <span>{t("common.unitsN", { n: num(bill.units) })}</span>
        <span className={bill.status === "protected" ? "" : "danger"}>{bill.status === "protected" ? t("bill.protected") : t("bill.nonProtected")}</span>
        <span>{data.settings.meterType === "tou" ? t("bill.touMeter") : t("bill.normalMeter")}</span>
        {showEstimate && <span>{t("bill.projected")}</span>}
      </div>
      <Card className="total-card">
        <div>
          <p>{t("bill.payable")}</p>
          <h2>{rs(bill.payable)}</h2>
        </div>
        <div>
          <span>{t("bill.after", { rs: rs(bill.lps) })}</span>
          <b>{rs(bill.latePayable)}</b>
        </div>
        <em>{t("common.estimated")}</em>
      </Card>
      <div className="breakdown-grid">
        {charges.map((c) => (
          <Card key={c.title} style={{ background: c.color }} className="charge-card">
            <div className="charge-title">
              <h3>{t(c.title)}</h3>
              <b>{rs(c.total)}</b>
            </div>
            {c.rows.map(([label, amount, how]) => (
              <div className="charge-row" key={label}>
                <span>
                  {t(label)}
                  {details && <small className="charge-how">{how}</small>}
                </span>
                <b>{rs(amount)}</b>
              </div>
            ))}
            <button onClick={() => setDetails((d) => !d)} aria-expanded={details}>
              {details ? t("bill.hide") : t("bill.details")}
            </button>
          </Card>
        ))}
      </div>
      <div className="calculation-note">
        <b>i</b>
        <span>
          {bill.status === "protected" ? t("bill.noteProtected") : t("bill.noteNon", { n: num(bill.units), r: rate(bill.energyLines[0]?.rate ?? 0) })}{" "}
          {t("bill.noteTotal", { a: rs(bill.currentBill), b: rs(bill.fpaTotal) })}
        </span>
      </div>
      <p className="legal-note">{t("common.legal")}</p>
    </>
  );
}
