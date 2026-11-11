"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "./LanguageProvider";

export const C = {
  blue: "#213F99",
  lime: "#D4EE5E",
  pale: "#E4F5A1",
  pink: "#F38FD8",
  magenta: "#E544B5",
  mint: "#B7EED8",
  ink: "#111111",
  grey: "#EDEDED",
};

export type Mood = "happy" | "thinking" | "worried" | "celebrate";

export function Unity({ mood = "happy", size = 130 }: { mood?: Mood; size?: number }) {
  const { t } = useI18n();
  const mouth =
    mood === "worried" ? "M49 72 Q58 64 67 72" : mood === "thinking" ? "M51 69 Q58 72 64 69" : "M48 68 Q58 78 68 68";
  return (
    <svg viewBox="0 0 120 150" width={size} height={size * 1.25} role="img" aria-label={t("common.mascot", { mood })} className="unity">
      <path d="M70 5 24 76h29l-8 66 52-82H68z" fill={C.lime} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="49" cy="55" r="3.5" fill={C.ink} />
      <circle cx="67" cy="55" r="3.5" fill={C.ink} />
      <path d={mouth} fill="none" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      <path
        d={mood === "celebrate" ? "M30 78Q8 50 12 31M83 77q28-10 29-31" : "M31 80Q10 88 8 104M85 78q21 10 24 27"}
        fill="none"
        stroke={C.ink}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M48 135q-4 10-16 10M72 126q5 12 17 12" fill="none" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      {mood === "thinking" && <path d="M86 30q8-10 15-2t-3 14" fill={C.mint} stroke={C.ink} strokeWidth="3" />}
      {mood === "worried" && <path d="M81 38q7 9 0 14-7-5 0-14" fill={C.blue} />}
    </svg>
  );
}

export function AIBadge({ title }: { title?: string }) {
  const { t } = useI18n();
  return (
    <span className="ai-badge" title={title ?? t("common.aiTitle")}>
      AI
    </span>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: "blue" | "lime" | "white";
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({ children, variant = "blue", className = "", href, onClick, type = "button", disabled }: ButtonProps) {
  const cls = `button ${variant} ${className}`;
  if (href)
    return (
      <Link className={cls} href={href} onClick={onClick}>
        {children}
      </Link>
    );
  return (
    <button className={cls} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section className={`card ${className}`} style={style}>
      {children}
    </section>
  );
}

export function StepBar({ step }: { step: 1 | 2 }) {
  const { t } = useI18n();
  return (
    <div className="stepbar" aria-label={t("common.step", { n: step })}>
      <div className="active" />
      <div className={step >= 2 ? "active" : ""} />
      <span>{t("common.step", { n: step })}</span>
    </div>
  );
}

/** Half-circle gauge from the design; the arc fills to units/limit and turns magenta past the limit. */
export function Gauge({ units, limit = 200 }: { units: number; limit?: number }) {
  const { t } = useI18n();
  const f = Math.min(1, Math.max(0, units / limit));
  const a = Math.PI * (1 - f);
  const x = (110 + 85 * Math.cos(a)).toFixed(2);
  const y = (110 - 85 * Math.sin(a)).toFixed(2);
  return (
    <div className="gauge" role="img" aria-label={t("common.gauge", { u: units, l: limit })}>
      <svg viewBox="0 0 220 125">
        <path d="M25 110a85 85 0 0 1 170 0" fill="none" stroke={C.pale} strokeWidth="28" strokeLinecap="round" />
        {f > 0 && (
          <path
            d={`M25 110A85 85 0 0 1 ${x} ${y}`}
            fill="none"
            stroke={units > limit ? C.magenta : C.blue}
            strokeWidth="28"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div>
        <b dir="ltr">
          {Math.round(units)} <small>/ {limit}</small>
        </b>
        <span>{t("common.units")}</span>
      </div>
    </div>
  );
}

export const num = (n: number) => Math.round(n).toLocaleString("en-PK");

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <p className={`notice ${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="loading" role="status">
      <Unity mood="thinking" size={70} />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}
