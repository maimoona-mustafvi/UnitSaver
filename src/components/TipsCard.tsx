"use client";

import { useTips } from "./useTips";
import { AIBadge, Card } from "./ui";

const icons = ["⌁", "≈", "□"];

export function TipsCard() {
  const { enabled, loading, result, error } = useTips();
  return (
    <Card className="tips-card">
      <div className="result-title">
        <h2>Tips for you</h2>
        {result?.source === "ai" && <AIBadge title="Written by Gemini from your usage" />}
      </div>
      {!enabled && <p className="subtle">Snap your meter to get tips for this month.</p>}
      {loading && <p className="subtle" role="status">Writing tips for your home…</p>}
      {error && <p className="subtle">Couldn&apos;t load tips right now. Try again later.</p>}
      {result?.tips.map((tip, i) => (
        <div className="tip-row" key={tip}>
          <i aria-hidden>{icons[i % icons.length]}</i>
          <span>{tip}</span>
          <b aria-hidden>→</b>
        </div>
      ))}
    </Card>
  );
}
