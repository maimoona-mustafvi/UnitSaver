"use client";

import { useI18n } from "./LanguageProvider";
import { useTips } from "./useTips";
import { AIBadge, Card } from "./ui";

const icons = ["⌁", "≈", "□"];

export function TipsCard() {
  const { enabled, loading, result, error } = useTips();
  const { t } = useI18n();
  return (
    <Card className="tips-card">
      <div className="result-title">
        <h2>{t("tips.title")}</h2>
        {result?.source === "ai" && <AIBadge title={t("tips.aiTitle")} />}
      </div>
      {!enabled && <p className="subtle">{t("tips.snap")}</p>}
      {loading && (
        <p className="subtle" role="status">
          {t("tips.loading")}
        </p>
      )}
      {error && <p className="subtle">{t("tips.error")}</p>}
      {result?.tips.map((tip, i) => (
        <div className="tip-row" key={tip}>
          <i aria-hidden>{icons[i % icons.length]}</i>
          <span>{tip}</span>
          <b aria-hidden>{t("common.arrow")}</b>
        </div>
      ))}
    </Card>
  );
}
