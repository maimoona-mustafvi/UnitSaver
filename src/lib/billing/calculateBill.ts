import defaultTariffs from "@/config/tariffs.json";

export type Tariffs = typeof defaultTariffs;
export type BillStatus = "protected" | "nonProtected";

interface Slab {
  upTo: number | null;
  rate: number;
}

export interface EnergyLine {
  units: number;
  rate: number;
  amount: number;
}

export interface BillInput {
  units: number;
  status: BillStatus;
  /** FPA is charged on an earlier month's units (IESCO uses ~2 months back). Defaults to `units`. */
  fpaReferenceUnits?: number;
  arrears?: number;
  isFiler?: boolean;
  tariffs?: Tariffs;
}

export interface Bill {
  units: number;
  status: BillStatus;
  energyLines: EnergyLine[];
  energy: number;
  fixed: number;
  fcSurcharge: number;
  qtr: number;
  /** IESCO subtotal: energy + fixed + FC surcharge + QTR */
  base: number;
  ed: number;
  gst: number;
  tvFee: number;
  incomeTax: number;
  currentBill: number;
  fpaReferenceUnits: number;
  fpa: number;
  fpaTaxes: number;
  fpaTotal: number;
  arrears: number;
  payable: number;
  lps: number;
  latePayable: number;
}

const within = (units: number, upTo: number | null) => upTo === null || units <= upTo;

export function energyCharge(units: number, status: BillStatus, t: Tariffs = defaultTariffs): EnergyLine[] {
  if (units <= 0) return [];
  const slabs: Slab[] = t[status].slabs;
  if (status === "nonProtected") {
    // Non-protected: every unit at the rate of the slab the total falls into.
    const slab = slabs.find((s) => within(units, s.upTo)) ?? slabs[slabs.length - 1];
    return [{ units, rate: slab.rate, amount: units * slab.rate }];
  }
  // Protected: progressive, each slab's units at that slab's rate (overflow stays on the last slab).
  const lines: EnergyLine[] = [];
  let from = 0;
  slabs.forEach((s, i) => {
    const to = i === slabs.length - 1 || s.upTo === null ? units : Math.min(units, s.upTo);
    if (to > from) lines.push({ units: to - from, rate: s.rate, amount: (to - from) * s.rate });
    from = Math.max(from, to);
  });
  return lines;
}

export function fixedCharge(units: number, status: BillStatus, t: Tariffs = defaultTariffs): number {
  const list: { upTo: number | null; amount: number }[] = t[status].fixedCharges;
  return (list.find((f) => within(units, f.upTo)) ?? list[list.length - 1]).amount;
}

export function calculateBill({
  units,
  status,
  fpaReferenceUnits = units,
  arrears = 0,
  isFiler = true,
  tariffs: t = defaultTariffs,
}: BillInput): Bill {
  units = Math.max(0, units);
  const energyLines = energyCharge(units, status, t);
  const energy = energyLines.reduce((s, l) => s + l.amount, 0);
  const fixed = fixedCharge(units, status, t);
  const fcSurcharge = t.fcSurchargePerUnit * units;
  const qtr = t.qtrPerUnit * units;
  const base = energy + fixed + fcSurcharge + qtr;
  const ed = t.edPct * (energy + qtr);
  const gst = t.gstPct * (base + ed);
  const taxable = base + ed + gst;
  const incomeTax = !isFiler && taxable > t.incomeTax.billThreshold ? t.incomeTax.nonFilerPct * taxable : 0;
  // IESCO rounds the current bill and the FPA block separately before adding them.
  const currentBill = Math.round(taxable + t.tvFee + incomeTax);
  const fpa = t.fpaPerUnit * Math.max(0, fpaReferenceUnits);
  const fpaEd = t.edPct * fpa;
  const fpaTaxes = fpaEd + t.gstPct * (fpa + fpaEd);
  const fpaTotal = Math.round(fpa + fpaTaxes);
  const payable = currentBill + fpaTotal + Math.round(arrears);
  const lps = Math.round(t.lpsPct * base);
  return {
    units,
    status,
    energyLines,
    energy,
    fixed,
    fcSurcharge,
    qtr,
    base,
    ed,
    gst,
    tvFee: t.tvFee,
    incomeTax,
    currentBill,
    fpaReferenceUnits,
    fpa,
    fpaTaxes,
    fpaTotal,
    arrears,
    payable,
    lps,
    latePayable: payable + lps,
  };
}
