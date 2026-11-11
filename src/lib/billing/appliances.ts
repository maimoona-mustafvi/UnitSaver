import type { Appliance } from "@/types";

type Usage = Pick<Appliance, "watts" | "quantity" | "hoursPerDay" | "daysPerWeek">;

/** Average kWh per day, spreading weekly use (e.g. iron once a week) across all 7 days. */
export const applianceDailyUnits = (a: Usage) => (a.watts * a.quantity * a.hoursPerDay * ((a.daysPerWeek ?? 7) / 7)) / 1000;

export const applianceMonthlyUnits = (a: Usage) => applianceDailyUnits(a) * 30;

export function applianceTotals(list: Appliance[]) {
  const rows = list.map((a) => ({ ...a, units: applianceMonthlyUnits(a) })).sort((a, b) => b.units - a.units);
  const total = rows.reduce((s, r) => s + r.units, 0);
  return { rows: rows.map((r) => ({ ...r, share: total ? r.units / total : 0 })), total };
}

/** Units used in the first `daysSoFar` days of the cycle and over the whole cycle if usage continues. */
export function appliancePeriod(list: Appliance[], daysSoFar: number, cycleDays = 30) {
  const dailyUnits = list.reduce((s, a) => s + applianceDailyUnits(a), 0);
  const days = Math.min(cycleDays, Math.max(0, daysSoFar));
  return { dailyUnits, daysSoFar: days, daysLeft: cycleDays - days, unitsSoFar: dailyUnits * days, monthUnits: dailyUnits * cycleDays };
}

/** Whole hours/day the biggest appliance must drop so the total gets to ≤ limit; null if not needed or not enough. */
export function hoursToCut(list: Appliance[], limit = 200) {
  const { rows, total } = applianceTotals(list);
  const top = rows[0];
  if (!top || total <= limit) return null;
  const hours = Math.ceil((total - limit) / applianceMonthlyUnits({ ...top, hoursPerDay: 1 }));
  return hours <= top.hoursPerDay ? { appliance: top, hours } : null;
}
