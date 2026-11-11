export type MeterType = "normal" | "tou";
export type Source = "ai" | "manual";

/** "YYYY-MM" */
export type Month = string;

export interface MonthUnits {
  month: Month;
  units: number;
}

export interface Settings {
  company: string;
  meterType: MeterType;
  billingCycleDay: number;
  isFiler: boolean;
  alertThreshold: number;
  alertsEnabled: boolean;
}

export interface LastBill {
  month: Month;
  previousReading: number;
  presentReading: number;
  /** "YYYY-MM-DD" */
  readingDate: string;
}

export interface Reading {
  id: string;
  reading: number;
  date: string;
  units: number;
  source: Source;
}

export interface Appliance {
  id: string;
  name: string;
  watts: number;
  quantity: number;
  hoursPerDay: number;
}

export interface UserData {
  settings: Settings;
  history: MonthUnits[];
  lastBill: LastBill | null;
  readings: Reading[];
  appliances: Appliance[];
}

export const DEFAULT_SETTINGS: Settings = {
  company: "IESCO",
  meterType: "normal",
  billingCycleDay: 1,
  isFiler: true,
  alertThreshold: 170,
  alertsEnabled: true,
};
