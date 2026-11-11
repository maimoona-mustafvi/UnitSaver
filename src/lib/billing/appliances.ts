import type { Appliance } from "@/types";

export const applianceMonthlyUnits = (a: Pick<Appliance, "watts" | "quantity" | "hoursPerDay">) =>
  (a.watts * a.quantity * a.hoursPerDay * 30) / 1000;

export function applianceTotals(list: Appliance[]) {
  const rows = list.map((a) => ({ ...a, units: applianceMonthlyUnits(a) })).sort((a, b) => b.units - a.units);
  const total = rows.reduce((s, r) => s + r.units, 0);
  return { rows: rows.map((r) => ({ ...r, share: total ? r.units / total : 0 })), total };
}

/** Whole hours/day the biggest appliance must drop so the total gets to ≤ limit; null if not needed or not enough. */
export function hoursToCut(list: Appliance[], limit = 200) {
  const { rows, total } = applianceTotals(list);
  const top = rows[0];
  if (!top || total <= limit) return null;
  const hours = Math.ceil((total - limit) / applianceMonthlyUnits({ ...top, hoursPerDay: 1 }));
  return hours <= top.hoursPerDay ? { appliance: top, hours } : null;
}
