import { z } from "zod";

const month = z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const confidence = z.enum(["high", "medium", "low"]);

export const meterResultSchema = z.object({
  reading: z.number().int().nonnegative().nullable().describe("kWh digits on the meter display, null if unreadable"),
  confidence,
  notes: z.string().optional(),
});
export type MeterResult = z.infer<typeof meterResultSchema>;

// Every field is nullable so a partly readable bill still pre-fills what it can.
export const billResultSchema = z.object({
  billMonth: month.nullable(),
  previousReading: z.number().int().nonnegative().nullable(),
  presentReading: z.number().int().nonnegative().nullable(),
  readingDate: day.nullable(),
  unitsBilled: z.number().int().nonnegative().nullable(),
  tariff: z.string().nullable(),
  meterType: z.enum(["normal", "tou"]).nullable(),
  history: z.array(z.object({ month, units: z.number().int().nonnegative() })).max(12),
  confidence,
});
export type BillResult = z.infer<typeof billResultSchema>;

export const tipsRequestSchema = z.object({
  unitsSoFar: z.number().nonnegative(),
  daysLeft: z.number().int().nonnegative(),
  predictedUnits: z.number().nonnegative(),
  status: z.enum(["protected", "nonProtected"]),
  meterType: z.enum(["normal", "tou"]),
  appliances: z
    .array(
      z.object({ name: z.string().max(60), watts: z.number(), quantity: z.number(), hoursPerDay: z.number(), daysPerWeek: z.number().min(0).max(7).optional() }),
    )
    .max(30),
});
export type TipsRequest = z.infer<typeof tipsRequestSchema>;

export const tipsResultSchema = z.object({ tips: z.array(z.string().min(1).max(200)).min(1).max(5) });
export type TipsResponse = { tips: string[]; source: "ai" | "fallback" };
