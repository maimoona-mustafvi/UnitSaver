import defaultTariffs from "@/config/tariffs.json";
import type { MonthUnits } from "@/types";
import type { BillStatus, Tariffs } from "./calculateBill";

export interface ProtectedStatus {
  isProtected: boolean;
  /** Consecutive months ≤ limit, counting back from the newest (max 6). */
  monthsUnder: number;
  /** Months still needed under the limit to (re)gain protection. 0 when protected. */
  monthsRemaining: number;
  lastOverMonth: MonthUnits | null;
  window: MonthUnits[];
}

export const sortHistory = (h: MonthUnits[]) => [...h].sort((a, b) => a.month.localeCompare(b.month));

export function protectedStatus(history: MonthUnits[], t: Tariffs = defaultTariffs): ProtectedStatus {
  const limit = t.protectedLimit;
  const window = sortHistory(history).slice(-t.protectedMonths);
  let monthsUnder = 0;
  for (let i = window.length - 1; i >= 0 && window[i].units <= limit; i--) monthsUnder++;
  // Fewer than 6 known months, all ≤ limit, counts as protected: we can only judge what we know.
  const isProtected = window.every((m) => m.units <= limit);
  const lastOverMonth = [...window].reverse().find((m) => m.units > limit) ?? null;
  return {
    isProtected,
    monthsUnder,
    monthsRemaining: isProtected ? 0 : t.protectedMonths - monthsUnder,
    lastOverMonth,
    window,
  };
}

/** Status a bill of `units` is charged at: protected only if history is protected AND this month stays ≤ limit. */
export function billStatus(history: MonthUnits[], units: number, t: Tariffs = defaultTariffs): BillStatus {
  return protectedStatus(history, t).isProtected && units <= t.protectedLimit ? "protected" : "nonProtected";
}
