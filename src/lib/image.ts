import type { Key } from "@/i18n";

/** Downscales photos in the browser (max 1600px JPEG) so uploads stay small; PDFs and unreadable files pass through. */
export async function prepareUpload(file: File, maxSide = 1600): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/heic" || file.type === "image/heif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "upload.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

const CODES = ["no_file", "too_large", "bad_type", "not_configured", "invalid_key", "unreadable"] as const;

/** Error from an AI route; `key` is the translation to show. */
export class AiError extends Error {
  constructor(public key: Key) {
    super(key);
  }
}

/** POSTs a photo to an AI route and returns its JSON; throws AiError with a translatable key on failure. */
export async function postImage<T>(url: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("image", await prepareUpload(file));
  const res = await fetch(url, { method: "POST", body }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : {};
  if (!res?.ok) {
    const code = (CODES as readonly string[]).includes(json.code) ? json.code : "unreadable";
    throw new AiError(`err.${code}` as Key);
  }
  return json as T;
}

/** Translation key for any failure while reading a photo. */
export const aiErrorKey = (e: unknown): Key => (e instanceof AiError ? e.key : "err.unreadable");
