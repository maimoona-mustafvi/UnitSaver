import { errorResponse, fileFromRequest, generateJson } from "@/lib/gemini";
import { meterResultSchema } from "@/lib/schemas";

export const maxDuration = 30;

const PROMPT = `Read the electricity meter in this photo (Pakistani digital or mechanical kWh meter).
- reading: the cumulative kWh number on the display as an integer (ignore decimals, the red last drum and any other screens such as date, time, voltage or MDI). null if not clearly visible.
- confidence: "high" only if every digit is sharp; "low" if blurry, glare, cropped or you guessed a digit.
- notes: one short sentence about anything unclear (optional).`;

export async function POST(req: Request) {
  try {
    const file = await fileFromRequest(req);
    return Response.json(await generateJson(meterResultSchema, PROMPT, { file }));
  } catch (e) {
    return errorResponse(e);
  }
}
