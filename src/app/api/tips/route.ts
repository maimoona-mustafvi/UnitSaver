import { generateJson } from "@/lib/gemini";
import { tipsRequestSchema, tipsResultSchema, type TipsResponse } from "@/lib/schemas";
import { fallbackTips, filterTips } from "@/lib/tips";

export const maxDuration = 30;

export async function POST(req: Request) {
  const parsed = tipsRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const input = parsed.data;

  const prompt = `You are UnitSaver, a friendly energy coach for Pakistani households (IESCO/NEPRA tariffs).
Write exactly 3 short, specific, actionable tips (max 20 words each) to cut electricity use this billing cycle.
Facts (computed, trust them): ${JSON.stringify(input)}
- "predictedUnits" is the projected total for the whole month if usage continues; "daysPerWeek" is how many days a week an appliance runs (missing = every day).
- "status" is the NEPRA protected-slab status; staying at or below 200 units for 6 months keeps or regains protection.
- Mention concrete appliances from the list and numbers (hours, units) where possible.
- Never suggest something the user already does (e.g. ironing once a week when daysPerWeek is already 1).
- ${input.meterType === "tou" ? "This is a TOU meter: one tip may shift heavy loads out of peak hours." : "This is NOT a TOU meter: do NOT give any peak-hour or time-of-use advice."}
- ${input.lang === "ur" ? "Write every tip in simple, everyday Urdu (Urdu script), the way a Pakistani household speaks. Keep numbers as digits (0-9) and appliance names familiar (e.g. اے سی، فریج، استری، موٹر)." : "Write in simple English."}
- No greetings, no markdown.`;

  try {
    const { tips } = await generateJson(tipsResultSchema, prompt, { temperature: 0.6, timeoutMs: 10_000 });
    const clean = filterTips(tips, input.meterType).slice(0, 3);
    if (clean.length) return Response.json({ tips: clean, source: "ai" } satisfies TipsResponse);
  } catch (e) {
    console.error("[tips] falling back to rule-based tips", e);
  }
  return Response.json({ tips: fallbackTips(input), source: "fallback" } satisfies TipsResponse);
}
