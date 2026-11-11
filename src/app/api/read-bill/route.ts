import { errorResponse, fileFromRequest, generateJson } from "@/lib/gemini";
import { billResultSchema } from "@/lib/schemas";

export const maxDuration = 60;

const PROMPT = `You are reading a Pakistani electricity bill (IESCO, LESCO, FESCO, etc.).
Extract ONLY these fields; use null for anything you cannot read with certainty:
- billMonth: the billing month as YYYY-MM.
- previousReading / presentReading: the meter readings (integers) for the normal/off-peak register.
- readingDate: date the meter was read, YYYY-MM-DD.
- unitsBilled: units charged this month.
- tariff: tariff code, e.g. "A-1(a)".
- meterType: "tou" if the bill shows separate peak and off-peak readings, else "normal".
- history: the bill's month-wise units table (up to 12 entries, YYYY-MM, oldest first), NOT including the current bill month.
- confidence: your overall confidence.
Never output names, addresses, CNIC, phone numbers or reference/consumer numbers.`;

export async function POST(req: Request) {
  try {
    const file = await fileFromRequest(req);
    return Response.json(await generateJson(billResultSchema, PROMPT, { file }));
  } catch (e) {
    return errorResponse(e);
  }
}
