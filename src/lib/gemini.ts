import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const geminiModel = process.env.GEMINI_MODEL || "gemini-flash-latest";

export class InputError extends Error {}
export class GeminiUnavailable extends Error {}

let client: GoogleGenAI | undefined;
function ai() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiUnavailable("GEMINI_API_KEY is not set");
  return (client ??= new GoogleGenAI({ apiKey }));
}

export interface InlineFile {
  data: string;
  mimeType: string;
}

/** Structured-output call: the zod schema drives both Gemini's responseJsonSchema and validation of the reply. */
export async function generateJson<T extends z.ZodType>(
  schema: T,
  prompt: string,
  { file, temperature = 0 }: { file?: InlineFile; temperature?: number } = {},
): Promise<z.infer<T>> {
  const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  const res = await ai().models.generateContent({
    model: geminiModel,
    contents: [{ role: "user", parts: [...(file ? [{ inlineData: file }] : []), { text: prompt }] }],
    config: { responseMimeType: "application/json", responseJsonSchema: jsonSchema, temperature },
  });
  return schema.parse(JSON.parse(res.text ?? ""));
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

/** Reads the `image` field of a multipart request. The file is only held in memory and never stored. */
export async function fileFromRequest(req: Request): Promise<InlineFile> {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size === 0) throw new InputError("Please attach a photo.");
  if (file.size > MAX_BYTES) throw new InputError("That file is larger than 10MB.");
  if (!ALLOWED.test(file.type)) throw new InputError("Please upload a JPG, PNG, WEBP, HEIC or PDF file.");
  return { data: Buffer.from(await file.arrayBuffer()).toString("base64"), mimeType: file.type };
}

export function errorResponse(e: unknown) {
  if (e instanceof InputError) return Response.json({ error: e.message }, { status: 400 });
  console.error("[gemini]", e);
  if (e instanceof GeminiUnavailable) return Response.json({ error: "AI reading is not configured. Please enter the values manually." }, { status: 503 });
  if (/API key not valid|UNAUTHENTICATED|PERMISSION_DENIED/.test(String(e)))
    return Response.json({ error: "The Gemini API key is invalid. Check GEMINI_API_KEY, or enter the values manually." }, { status: 503 });
  return Response.json({ error: "We couldn't read it clearly. Try again or enter manually." }, { status: 502 });
}
