import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
// Used once when the main model is overloaded or times out.
const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";

/** Bad upload; `code` maps to an `err.*` translation on the client. */
export class InputError extends Error {
  constructor(public code: "no_file" | "too_large" | "bad_type") {
    super(code);
  }
}
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
  { file, temperature = 0, timeoutMs = 25_000 }: { file?: InlineFile; temperature?: number; timeoutMs?: number } = {},
): Promise<z.infer<T>> {
  const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  const models = [geminiModel, fallbackModel].filter((m, i, all) => m && all.indexOf(m) === i);
  for (let i = 0; ; i++) {
    try {
      const res = await ai().models.generateContent({
        model: models[i],
        contents: [{ role: "user", parts: [...(file ? [{ inlineData: file }] : []), { text: prompt }] }],
        // Gemini sometimes stalls for minutes; give up so the caller can fall back (manual entry / rule-based tips).
        config: { responseMimeType: "application/json", responseJsonSchema: jsonSchema, temperature, abortSignal: AbortSignal.timeout(timeoutMs) },
      });
      return schema.parse(JSON.parse(res.text ?? ""));
    } catch (e) {
      // Busy (429/503) or timed out: try the lighter model once. Anything else (bad key, bad input) fails straight away.
      if (i + 1 >= models.length || !/\b(429|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|abort|timeout/i.test(String(e))) throw e;
      console.warn(`[gemini] ${models[i]} busy, retrying with ${models[i + 1]}`);
    }
  }
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

/** Reads the `image` field of a multipart request. The file is only held in memory and never stored. */
export async function fileFromRequest(req: Request): Promise<InlineFile> {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size === 0) throw new InputError("no_file");
  if (file.size > MAX_BYTES) throw new InputError("too_large");
  if (!ALLOWED.test(file.type)) throw new InputError("bad_type");
  return { data: Buffer.from(await file.arrayBuffer()).toString("base64"), mimeType: file.type };
}

export function errorResponse(e: unknown) {
  if (e instanceof InputError) return Response.json({ code: e.code, error: e.message }, { status: 400 });
  console.error("[gemini]", e);
  if (e instanceof GeminiUnavailable) return Response.json({ code: "not_configured", error: "AI reading is not configured" }, { status: 503 });
  if (/API key not valid|UNAUTHENTICATED|PERMISSION_DENIED/.test(String(e)))
    return Response.json({ code: "invalid_key", error: "Gemini API key is invalid" }, { status: 503 });
  return Response.json({ code: "unreadable", error: "Could not read the image" }, { status: 502 });
}
