"use client";

import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { SetupPrompt } from "@/components/SetupPrompt";
import { Button, Card, Gauge, Loading, Unity, num, rs } from "@/components/ui";
import { formatDate, monthLabel } from "@/lib/dates";

export default function DashboardPage() {
  const router = useRouter();
  const { loading, summary, error } = useData();
  if (loading) return <Loading />;
  if (!summary) return error ? <p className="notice error">{error}</p> : <SetupPrompt />;

  const { unitsSoFar, hasReading, latestReading, daysLeft, prediction, status, estimate, lastBill, co2 } = summary;
  const willCross = status.isProtected && prediction.predictedUnits > 200;

  return (
    <>
      <div className="dashboard-grid">
        <Card className="units-card">
          <div className="card-kicker">
            Units this month <span>{latestReading ? `As of ${formatDate(latestReading.date)}` : "No reading yet"}</span>
          </div>
          <Gauge units={unitsSoFar} />
          <p>{daysLeft} days left in billing cycle</p>
          {!hasReading && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Button href="/reading">Snap your meter →</Button>
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
          <p>Status</p>
          <h2>{status.isProtected ? "PROTECTED" : "NON-PROTECTED"}</h2>
          {status.isProtected ? (
            <span>
              {status.window.length} of {status.window.length} months under 200 units
            </span>
          ) : (
            <span>
              {status.monthsRemaining} more month{status.monthsRemaining === 1 ? "" : "s"} under 200 to become protected
            </span>
          )}
          <small className="warn">
            {willCross
              ? "On pace to cross 200 – you'd lose protection for 6 months."
              : status.isProtected
                ? "Stay ≤ 200 every month to keep it."
                : "Crossing 200 again resets the countdown."}
          </small>
        </Card>

        <Card className="bill-card">
          <div className="result-title">
            <p>{hasReading ? "Estimated bill" : "Last bill"}</p>
            <span className="estimated-tag">Estimated</span>
          </div>
          <h2>{rs(hasReading ? estimate.payable : lastBill.payable)}</h2>
          <p style={{ fontSize: 12, margin: "-10px 0 14px" }}>
            {hasReading ? `At month-end pace · ${num(estimate.units)} units` : `${num(lastBill.units)} units`}
          </p>
          <button onClick={() => router.push("/bill")}>View breakdown →</button>
          <div className="half-moon" />
        </Card>

        <Card className="prediction-card">
          <p>Month-end prediction</p>
          <h2>{hasReading ? `${num(prediction.predictedUnits)} units` : "—"}</h2>
          <hr />
          <p>Daily budget</p>
          <strong>
            {!hasReading
              ? "Add a reading"
              : prediction.dailyBudget === null
                ? "200 limit reached"
                : `${prediction.dailyBudget.toFixed(1)} units/day`}
          </strong>
          <Unity size={55} />
        </Card>

        <Card className="co2-card">
          <div className="leaf" aria-hidden>
            ♧
          </div>
          <p>Positive impact</p>
          <h2>{co2 ? `${co2.kg.toFixed(1)} kg CO₂ saved` : "— kg CO₂"}</h2>
          <span>
            {co2
              ? `vs ${monthLabel(co2.baselineMonth, true)} (${num(co2.baselineUnits)} units) · ${num(co2.unitsSaved)} units less`
              : "Snap your meter to see your impact"}
          </span>
        </Card>
      </div>
      <p className="legal-note">Estimate based on current NEPRA tariffs. Actual bill may vary.</p>
    </>
  );
}
