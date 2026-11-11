import { DEFAULT_SETTINGS, type UserData } from "@/types";
import { addDays, addMonths, monthOf, todayISO } from "@/lib/dates";

/** Reference IESCO bill from PROJECT.md §6.7 (Jul-23 → Jun-24 history, 431 units billed). */
export const REFERENCE_HISTORY = [408, 404, 420, 265, 148, 148, 148, 160, 157, 224, 279, 424];
export const REFERENCE_BILL = { previousReading: 50875, presentReading: 51306 };

/**
 * Demo data built from the reference bill, with dates shifted so the bill's reading was 19 days ago
 * and a fresh meter reading was taken today (142 units → on pace to cross 200, so the alert shows).
 */
export function demoData(today = todayISO()): UserData {
  const readingDate = addDays(today, -19);
  const billMonth = monthOf(readingDate);
  const history = REFERENCE_HISTORY.map((units, i) => ({ month: addMonths(billMonth, i - 12), units }));
  history.push({ month: billMonth, units: REFERENCE_BILL.presentReading - REFERENCE_BILL.previousReading });
  return {
    settings: { ...DEFAULT_SETTINGS, billingCycleDay: Number(readingDate.slice(8)) },
    history,
    lastBill: { month: billMonth, ...REFERENCE_BILL, readingDate },
    readings: [{ id: "demo-1", reading: 51448, date: today, units: 142, source: "manual" }],
    appliances: [
      { id: "demo-ac", name: "AC 1.5 Ton", watts: 1500, quantity: 1, hoursPerDay: 4 },
      { id: "demo-fan", name: "Ceiling Fan", watts: 75, quantity: 3, hoursPerDay: 10 },
      { id: "demo-fridge", name: "Fridge", watts: 150, quantity: 1, hoursPerDay: 10 },
      { id: "demo-motor", name: "Water Motor", watts: 750, quantity: 1, hoursPerDay: 1 },
      { id: "demo-iron", name: "Iron", watts: 1000, quantity: 1, hoursPerDay: 0.5 },
      { id: "demo-led", name: "LED Bulb", watts: 12, quantity: 6, hoursPerDay: 6 },
    ],
  };
}
