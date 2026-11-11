import defaultTariffs from "@/config/tariffs.json";
import type { MonthUnits, Reading, UserData } from "@/types";
import { addMonths, addMonthsToDate, daysBetween, todayISO } from "@/lib/dates";
import { calculateBill, type Bill, type BillStatus } from "./calculateBill";
import { billStatus, protectedStatus, sortHistory, type ProtectedStatus } from "./protectedStatus";
import { predict, type Prediction } from "./prediction";
import { co2Kg, unitsSaved } from "./co2";

export interface Summary {
  /** Month the running cycle will be billed as. */
  currentMonth: string;
  cycleStart: string;
  cycleEnd: string;
  history: MonthUnits[];
  hasReading: boolean;
  latestReading: Reading | null;
  unitsSoFar: number;
  daysElapsed: number;
  daysLeft: number;
  prediction: Prediction;
  status: ProtectedStatus;
  estimateStatus: BillStatus;
  /** Month-end estimate at the current pace. */
  estimate: Bill;
  lastBillUnits: number;
  lastBill: Bill;
  co2: Co2Summary;
  alert: boolean;
}

export interface Co2Summary {
  /** true: footprint is this cycle's month-end forecast; false: no reading yet, so it's the last bill's month. */
  forecast: boolean;
  units: number;
  /** kg CO2 for `units`. */
  footprintKg: number;
  baselineMonth: string;
  baselineUnits: number;
  /** kg avoided vs the baseline month (0 if using more). */
  savedKg: number;
  /** kg above the baseline month (0 if using less). */
  extraKg: number;
  /** kg that staying at 200 units would avoid this month (0 if already ≤ 200). */
  avoidableKg: number;
}

const unitsIn = (h: MonthUnits[], month: string) => h.find((m) => m.month === month)?.units;

/** Everything the dashboard and bill page need, derived deterministically from stored data. */
export function summarize(data: UserData, today = todayISO(), t = defaultTariffs): Summary | null {
  const lb = data.lastBill;
  if (!lb) return null;
  const lastBillUnits = Math.max(0, lb.presentReading - lb.previousReading);
  // The billed month counts as a completed month even if the user's history list missed it.
  const history = sortHistory(
    unitsIn(data.history, lb.month) === undefined ? [...data.history, { month: lb.month, units: lastBillUnits }] : data.history,
  );

  const currentMonth = addMonths(lb.month, 1);
  const cycleStart = lb.readingDate;
  const cycleEnd = addMonthsToDate(cycleStart, 1);
  const cycleDays = daysBetween(cycleStart, cycleEnd);

  const latestReading =
    [...data.readings]
      .filter((r) => r.date >= cycleStart && r.reading >= lb.presentReading)
      .sort((a, b) => b.date.localeCompare(a.date) || b.reading - a.reading)[0] ?? null;
  const hasReading = latestReading !== null;
  const unitsSoFar = latestReading ? latestReading.reading - lb.presentReading : 0;
  const asOf = latestReading?.date ?? today;
  const daysElapsed = Math.min(cycleDays, Math.max(hasReading ? 1 : 0, daysBetween(cycleStart, asOf)));
  const daysLeft = cycleDays - daysElapsed;

  const prediction = predict({
    unitsSoFar,
    daysElapsed,
    daysLeft,
    limit: t.protectedLimit,
    alertThreshold: data.settings.alertThreshold,
  });
  const status = protectedStatus(history, t);
  const estimateStatus = billStatus(history, prediction.predictedUnits, t);
  const estimate = calculateBill({
    units: prediction.predictedUnits,
    status: estimateStatus,
    fpaReferenceUnits: unitsIn(history, addMonths(currentMonth, -2)) ?? prediction.predictedUnits,
    isFiler: data.settings.isFiler,
    tariffs: t,
  });
  const lastBill = calculateBill({
    units: lastBillUnits,
    status: billStatus(history.filter((m) => m.month < lb.month), lastBillUnits, t),
    fpaReferenceUnits: unitsIn(history, addMonths(lb.month, -2)) ?? lastBillUnits,
    isFiler: data.settings.isFiler,
    tariffs: t,
  });

  // CO2 for this cycle's forecast (or the last bill before any reading), compared with the same month last year
  // when known, else the month before.
  const co2Month = hasReading ? currentMonth : lb.month;
  const co2Units = hasReading ? prediction.predictedUnits : lastBillUnits;
  const lastYear = addMonths(co2Month, -12);
  const baselineMonth = unitsIn(history, lastYear) !== undefined ? lastYear : addMonths(co2Month, -1);
  const baselineUnits = unitsIn(history, baselineMonth) ?? co2Units;
  const kg = (u: number) => co2Kg(u, t.gridEmissionFactor);
  const co2: Co2Summary = {
    forecast: hasReading,
    units: co2Units,
    footprintKg: kg(co2Units),
    baselineMonth,
    baselineUnits,
    savedKg: kg(unitsSaved(baselineUnits, co2Units)),
    extraKg: kg(unitsSaved(co2Units, baselineUnits)),
    avoidableKg: kg(Math.max(0, co2Units - t.protectedLimit)),
  };

  return {
    currentMonth,
    cycleStart,
    cycleEnd,
    history,
    hasReading,
    latestReading,
    unitsSoFar,
    daysElapsed,
    daysLeft,
    prediction,
    status,
    estimateStatus,
    estimate,
    lastBillUnits,
    lastBill,
    co2,
    alert: hasReading && data.settings.alertsEnabled && prediction.alert,
  };
}
