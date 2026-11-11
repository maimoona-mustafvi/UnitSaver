"use client";

import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { useI18n } from "@/components/LanguageProvider";
import { SetupPrompt } from "@/components/SetupPrompt";
import { TipsCard } from "@/components/TipsCard";
import { Button, Card, Gauge, Loading, Unity, num } from "@/components/ui";

const kg = (n: number) => n.toFixed(n < 10 ? 1 : 0);

export default function DashboardPage() {
  const router = useRouter();
  const { loading, summary, error } = useData();
  const { t, rs, month, date } = useI18n();
  if (loading) return <Loading />;
  if (!summary) return error ? <p className="notice error">{error}</p> : <SetupPrompt />;

  const { unitsSoFar, hasReading, latestReading, daysLeft, prediction, status, estimate, lastBill, co2 } = summary;
  const willCross = status.isProtected && prediction.predictedUnits > 200;
  const baseline = month(co2.baselineMonth, true);

  return (
    <>
      <div className="dashboard-grid">
        <Card className="units-card">
          <div className="card-kicker">
            {t("dash.unitsThisMonth")} <span>{latestReading ? t("dash.asOf", { date: date(latestReading.date) }) : t("dash.noReading")}</span>
          </div>
          <Gauge units={unitsSoFar} />
          <p>{t("dash.daysLeft", { n: daysLeft })}</p>
          {!hasReading && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Button href="/reading">{t("dash.snap")}</Button>
            </div>
          )}
          <div className="peek">
            <Unity size={92} mood={unitsSoFar > 200 ? "worried" : summary.alert ? "thinking" : "happy"} />
          </div>
        </Card>

        <Card className={`protected-card ${status.isProtected ? "" : "danger"}`}>
          <div className="shield" aria-hidden>
            {status.isProtected ? "✓" : "!"}
          </div>
          <p>{t("dash.status")}</p>
          <h2>{status.isProtected ? t("dash.protected") : t("dash.nonProtected")}</h2>
          <span>
            {status.isProtected ? t("dash.monthsUnder", { n: status.window.length }) : t("dash.monthsRemaining", { n: status.monthsRemaining })}
          </span>
          <small className="warn">{willCross ? t("dash.willCross") : status.isProtected ? t("dash.keep") : t("dash.reset")}</small>
        </Card>

        <Card className="bill-card">
          <div className="result-title">
            <p>{hasReading ? t("dash.estimatedBill") : t("dash.lastBill")}</p>
            <span className="estimated-tag">{t("common.estimated")}</span>
          </div>
          <h2>{rs(hasReading ? estimate.payable : lastBill.payable)}</h2>
          <p style={{ fontSize: 12, margin: "-10px 0 14px" }}>
            {hasReading ? t("dash.atPace", { n: num(estimate.units) }) : t("common.unitsN", { n: num(lastBill.units) })}
          </p>
          <button onClick={() => router.push("/bill")}>{t("dash.viewBreakdown")}</button>
          <div className="half-moon" />
        </Card>

        <Card className="prediction-card">
          <p>{t("dash.prediction")}</p>
          <h2>{hasReading ? t("common.unitsN", { n: num(prediction.predictedUnits) }) : "—"}</h2>
          <hr />
          <p>{t("dash.dailyBudget")}</p>
          <strong>
            {!hasReading
              ? t("dash.addReading")
              : prediction.dailyBudget === null
                ? t("dash.limitReached")
                : t("dash.perDay", { n: prediction.dailyBudget.toFixed(1) })}
          </strong>
          <Unity size={55} />
        </Card>

        <Card className="co2-card">
          <div className="leaf" aria-hidden>
            ♧
          </div>
          <p>{co2.forecast ? t("dash.co2Month") : t("dash.co2Last")}</p>
          <h2>{co2.savedKg > 0 ? t("dash.co2Saved", { kg: kg(co2.savedKg) }) : t("dash.co2Kg", { kg: kg(co2.footprintKg) })}</h2>
          <span>
            {co2.savedKg > 0
              ? t("dash.co2Vs", { u: num(co2.units), b: num(co2.baselineUnits), m: baseline, kg: kg(co2.footprintKg) })
              : co2.extraKg > 0
                ? t("dash.co2More", { kg: kg(co2.extraKg), m: baseline, b: num(co2.baselineUnits) })
                : t("dash.co2Same", { m: baseline })}
          </span>
          {co2.avoidableKg > 0 && <small className="co2-tip">{t("dash.co2Avoid", { kg: kg(co2.avoidableKg) })}</small>}
        </Card>
        <TipsCard />
      </div>
      <p className="legal-note">{t("common.legal")}</p>
    </>
  );
}
