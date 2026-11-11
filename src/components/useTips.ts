"use client";

import { useEffect, useState } from "react";
import type { TipsRequest, TipsResponse } from "@/lib/schemas";
import { useData } from "./DataProvider";
import { useI18n } from "./LanguageProvider";

// One request per distinct input per page load, shared by the tips card and the alert modal.
const cache = new Map<string, Promise<TipsResponse>>();

function fetchTips(body: TipsRequest) {
  const key = JSON.stringify(body);
  if (!cache.has(key)) {
    const p = fetch("/api/tips", { method: "POST", headers: { "content-type": "application/json" }, body: key }).then((r) => {
      if (!r.ok) throw new Error(`tips ${r.status}`);
      return r.json() as Promise<TipsResponse>;
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key)!;
}

/** Tips for the metered cycle by default; pass `override` to get tips for another projection (e.g. the appliance estimate). */
export function useTips(override?: TipsRequest | null) {
  const { data, summary } = useData();
  const { lang } = useI18n();
  const [state, setState] = useState<{ key?: string; result?: TipsResponse; error?: boolean }>({});

  const body: TipsRequest | null =
    override !== undefined
      ? override
      : data && summary?.hasReading
        ? {
            unitsSoFar: summary.unitsSoFar,
            daysLeft: summary.daysLeft,
            predictedUnits: summary.prediction.predictedUnits,
            status: summary.status.isProtected ? "protected" : "nonProtected",
            meterType: data.settings.meterType,
            appliances: data.appliances.map(({ name, watts, quantity, hoursPerDay, daysPerWeek }) => ({ name, watts, quantity, hoursPerDay, daysPerWeek })),
          }
        : null;
  const key = body ? JSON.stringify({ ...body, lang }) : undefined;

  useEffect(() => {
    if (!key) return;
    let live = true;
    fetchTips(JSON.parse(key))
      .then((result) => live && setState({ key, result }))
      .catch(() => live && setState({ key, error: true }));
    return () => {
      live = false;
    };
  }, [key]);

  const current = state.key === key ? state : {};
  return { enabled: Boolean(key), loading: Boolean(key) && !current.result && !current.error, ...current };
}
