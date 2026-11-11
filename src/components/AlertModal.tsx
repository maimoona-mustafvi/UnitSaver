"use client";

import { useEffect } from "react";
import { calculateBill } from "@/lib/billing";
import { useData } from "./DataProvider";
import { useTips } from "./useTips";
import { AIBadge, Button, Unity, num, rs } from "./ui";

export function AlertModal({ close }: { close: () => void }) {
  const { summary } = useData();
  const tips = useTips();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!summary) return null;
  const { unitsSoFar, prediction, status, estimate } = summary;
  const over = unitsSoFar > 200;
  // What staying at 200 (protected) would cost vs. the projected non-protected bill.
  const saving = status.isProtected
    ? estimate.payable - calculateBill({ units: Math.min(200, prediction.predictedUnits), status: "protected", fpaReferenceUnits: estimate.fpaReferenceUnits }).payable
    : 0;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="alert-modal" role="dialog" aria-modal="true" aria-labelledby="alert-title">
        <button className="modal-close" onClick={close} aria-label="Close">
          ×
        </button>
        <div className="alert-mascot">
          <Unity mood="worried" size={110} />
        </div>
        <div>
          <h1 id="alert-title">{over ? "OVER 200!" : "SLOW DOWN!"}</h1>
          <p>
            You&apos;ve used <b>{num(unitsSoFar)} units.</b> At this pace you&apos;ll reach <b>{num(prediction.predictedUnits)} units</b>
            {status.isProtected
              ? " and lose protected status for 6 months."
              : `. You need ${status.monthsRemaining} more month${status.monthsRemaining === 1 ? "" : "s"} under 200 to become protected – crossing 200 restarts the countdown.`}
          </p>
          {saving > 0 ? (
            <span className="danger-chip">Staying under 200 saves about {rs(saving)} this month</span>
          ) : (
            <span className="danger-chip">The 6-month countdown resets if you cross 200</span>
          )}
          <div className="tip-box">
            {prediction.dailyBudget !== null && (
              <div>
                <i>↓</i>
                <span>
                  Use at most <b>{prediction.dailyBudget.toFixed(1)} units</b> per day for the next {summary.daysLeft} days
                </span>
              </div>
            )}
            {tips.loading && (
              <div>
                <i>…</i>
                <span>Writing tips for you…</span>
              </div>
            )}
            {tips.result?.tips
              .filter((t) => prediction.dailyBudget === null || !/units a day/i.test(t)) // budget line above already says it
              .slice(0, 2)
              .map((t) => (
              <div key={t}>
                <i>⌁</i>
                <span>
                  {t} {tips.result?.source === "ai" && <AIBadge />}
                </span>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <Button onClick={close}>Got it</Button>
            <Button variant="white" href="/appliances" onClick={close}>
              See my appliances
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
