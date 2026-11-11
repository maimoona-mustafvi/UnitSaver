"use client";

import { useEffect } from "react";
import { calculateBill } from "@/lib/billing";
import { useData } from "./DataProvider";
import { useI18n } from "./LanguageProvider";
import { useTips } from "./useTips";
import { AIBadge, Button, Unity, num } from "./ui";

// The daily-budget line already says this; skip tips that repeat it (English and Urdu fallback wording).
const BUDGET_TIP = /units a day|یونٹ روزانہ|روزانہ .* یونٹ/i;

export function AlertModal({ close }: { close: () => void }) {
  const { summary } = useData();
  const { t, rs } = useI18n();
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
        <button className="modal-close" onClick={close} aria-label={t("common.close")}>
          ×
        </button>
        <div className="alert-mascot">
          <Unity mood="worried" size={110} />
        </div>
        <div>
          <h1 id="alert-title">{over ? t("alert.over") : t("alert.slow")}</h1>
          <p>
            {t("alert.body", { u: num(unitsSoFar), p: num(prediction.predictedUnits) })}
            {status.isProtected ? t("alert.lose") : t("alert.need", { n: status.monthsRemaining })}
          </p>
          <span className="danger-chip">{saving > 0 ? t("alert.saves", { rs: rs(saving) }) : t("alert.countdown")}</span>
          <div className="tip-box">
            {prediction.dailyBudget !== null && (
              <div>
                <i>↓</i>
                <span>{t("alert.budget", { n: prediction.dailyBudget.toFixed(1), d: summary.daysLeft })}</span>
              </div>
            )}
            {tips.loading && (
              <div>
                <i>…</i>
                <span>{t("alert.writing")}</span>
              </div>
            )}
            {tips.result?.tips
              .filter((tip) => prediction.dailyBudget === null || !BUDGET_TIP.test(tip))
              .slice(0, 2)
              .map((tip) => (
                <div key={tip}>
                  <i>⌁</i>
                  <span>
                    {tip} {tips.result?.source === "ai" && <AIBadge />}
                  </span>
                </div>
              ))}
          </div>
          <div className="modal-actions">
            <Button onClick={close}>{t("alert.gotIt")}</Button>
            <Button variant="white" href="/appliances" onClick={close}>
              {t("alert.seeAppliances")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
