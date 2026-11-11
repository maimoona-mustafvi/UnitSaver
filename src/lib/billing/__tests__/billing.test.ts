import { describe, expect, it } from "vitest";
import tariffs from "@/config/tariffs.json";
import { demoData, REFERENCE_HISTORY } from "@/lib/demo";
import {
  applianceMonthlyUnits,
  applianceTotals,
  billStatus,
  calculateBill,
  co2Kg,
  hoursToCut,
  predict,
  protectedStatus,
  summarize,
  unitsSaved,
} from "..";

const near = (actual: number, expected: number, tol = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
const months = ["2023-07", "2023-08", "2023-09", "2023-10", "2023-11", "2023-12", "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"];
const refHistory = REFERENCE_HISTORY.map((units, i) => ({ month: months[i], units }));

describe("calculateBill – reference IESCO bill, July 2024 (PROJECT.md §6.7)", () => {
  const bill = calculateBill({ units: 51306 - 50875, status: "nonProtected", fpaReferenceUnits: 279 });

  it("matches every line of the real bill within ±1 rupee", () => {
    expect(bill.units).toBe(431);
    expect(bill.energyLines).toEqual([{ units: 431, rate: 38.912, amount: 431 * 38.912 }]);
    near(bill.energy, 16771);
    expect(bill.fixed).toBe(240);
    near(bill.qtr, 1041.04, 0.01);
    near(bill.base, 19444.17);
    near(bill.ed, 267);
    near(bill.gst, 3548);
    expect(bill.tvFee).toBe(35);
    near(bill.currentBill, 23294);
    near(bill.fpaTotal, 1112);
    near(bill.payable, 24406);
    near(bill.lps, 1944);
    near(bill.latePayable, 26350);
  });

  it("adds arrears and non-filer income tax only when applicable", () => {
    expect(calculateBill({ units: 431, status: "nonProtected", fpaReferenceUnits: 279, arrears: 100 }).payable).toBe(bill.payable + 100);
    expect(calculateBill({ units: 431, status: "nonProtected", isFiler: false }).incomeTax).toBe(0); // below threshold
    expect(calculateBill({ units: 900, status: "nonProtected", isFiler: false }).incomeTax).toBeGreaterThan(0);
  });
});

describe("calculateBill – slab rules", () => {
  it("protected is progressive across slabs", () => {
    const [a, b] = tariffs.protected.slabs;
    const bill = calculateBill({ units: 150, status: "protected" });
    expect(bill.energyLines).toEqual([
      { units: 100, rate: a.rate, amount: 100 * a.rate },
      { units: 50, rate: b.rate, amount: 50 * b.rate },
    ]);
  });

  it("non-protected charges all units at the slab the total falls into", () => {
    expect(calculateBill({ units: 150, status: "nonProtected" }).energyLines[0].rate).toBe(tariffs.nonProtected.slabs[1].rate);
    expect(calculateBill({ units: 1000, status: "nonProtected" }).energyLines[0].rate).toBe(tariffs.nonProtected.slabs[7].rate);
  });

  it("zero units still pays the TV fee", () => {
    expect(calculateBill({ units: 0, status: "protected" }).payable).toBe(tariffs.tvFee);
  });
});

describe("protectedStatus", () => {
  it("reference history is non-protected with a full 6-month countdown", () => {
    const s = protectedStatus(refHistory);
    expect(s.isProtected).toBe(false);
    expect(s.monthsUnder).toBe(0);
    expect(s.monthsRemaining).toBe(6);
    expect(s.lastOverMonth).toEqual({ month: "2024-06", units: 424 });
  });

  it("before April the user was one month from regaining protection", () => {
    const s = protectedStatus(refHistory.slice(0, 9)); // up to Mar-24
    expect(s.isProtected).toBe(false);
    expect(s.monthsRemaining).toBe(1);
  });

  it("six months ≤ 200 is protected; unsorted input is handled", () => {
    const h = refHistory.slice(3, 9).map((m) => ({ ...m, units: 150 })).reverse();
    expect(protectedStatus(h)).toMatchObject({ isProtected: true, monthsRemaining: 0, monthsUnder: 6 });
  });

  it("a protected household crossing 200 this month is billed non-protected", () => {
    const h = refHistory.slice(4, 9);
    expect(billStatus(h, 199)).toBe("protected");
    expect(billStatus(h, 201)).toBe("nonProtected");
  });
});

describe("prediction", () => {
  it("projects month-end units and the daily budget", () => {
    const p = predict({ unitsSoFar: 100, daysElapsed: 10, daysLeft: 20 });
    expect(p).toEqual({ dailyAvg: 10, predictedUnits: 300, dailyBudget: 5, alert: true });
  });
  it("alerts on threshold even if the forecast is fine", () => {
    expect(predict({ unitsSoFar: 175, daysElapsed: 29, daysLeft: 1 }).alert).toBe(true);
    expect(predict({ unitsSoFar: 60, daysElapsed: 15, daysLeft: 15 }).alert).toBe(false);
  });
  it("no budget once the limit is crossed", () => {
    expect(predict({ unitsSoFar: 210, daysElapsed: 20, daysLeft: 10 }).dailyBudget).toBeNull();
  });
});

describe("co2 + appliances", () => {
  it("co2 uses the grid factor and never goes negative", () => {
    expect(unitsSaved(250, 200)).toBe(50);
    expect(unitsSaved(150, 200)).toBe(0);
    expect(co2Kg(10)).toBeCloseTo(10 * tariffs.gridEmissionFactor);
  });
  it("estimates appliance units and the cut needed", () => {
    expect(applianceMonthlyUnits({ watts: 1500, quantity: 1, hoursPerDay: 6 })).toBe(270);
    const list = [
      { id: "a", name: "AC", watts: 1500, quantity: 1, hoursPerDay: 6 },
      { id: "b", name: "Fan", watts: 75, quantity: 2, hoursPerDay: 10 },
    ];
    const { total, rows } = applianceTotals(list);
    expect(total).toBe(315);
    expect(rows[0].name).toBe("AC");
    expect(hoursToCut(list)).toMatchObject({ hours: 3 }); // 45 units/hour/month
  });
});

describe("summarize (demo data)", () => {
  const s = summarize(demoData("2026-11-11"), "2026-11-11")!;
  it("reconstructs the reference bill as the last bill", () => {
    expect(s.lastBillUnits).toBe(431);
    near(s.lastBill.payable, 24406);
  });
  it("tracks the current cycle and raises the near-200 alert", () => {
    expect(s.unitsSoFar).toBe(142);
    expect(s.daysElapsed).toBe(19);
    expect(s.prediction.predictedUnits).toBeGreaterThan(200);
    expect(s.alert).toBe(true);
    expect(s.status.isProtected).toBe(false);
  });
  it("returns null before setup", () => {
    expect(summarize({ ...demoData(), lastBill: null })).toBeNull();
  });
});
