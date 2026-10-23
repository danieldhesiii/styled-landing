import { env } from "@/lib/server/env";

// Thin adapter over the image-edit API (OpenAI's /v1/images/edits). Everything
// provider-specific lives here so the model can be swapped without touching the
// route. Only parameters the existing scripts/generate-renders.mjs is known to
// work with are sent.

export type ImageModelErrorKind = "moderation" | "busy" | "auth" | "failed";

export class ImageModelError extends Error {
  constructor(public kind: ImageModelErrorKind, message: string) {
    super(message);
  }
}

// Pick the closest supported output size to the photo's shape.
export function sizeFor(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.15) return "1536x1024";
  if (ratio < 0.87) return "1024x1536";
  return "1024x1024";
}

export interface EditResult {
  image: Buffer;
  usage: unknown; // token usage as reported by the provider, if any
}

// `images[0]` is the picture that gets edited. Any further images are extra
// references (other angles of the same room). A single image is sent as the
// plain `image` field the existing scripts use; several use `image[]`.
export async function editImage(opts: {
  images: Buffer[];
  prompt: string;
  size: string;
  quality?: string; // override env.renderQuality (e.g. "low" for draft renders)
}): Promise<EditResult> {
  const key = env.openaiApiKey;

  const form = new FormData();
  form.append("model", env.imageModel);
  const field = opts.images.length > 1 ? "image[]" : "image";
  opts.images.forEach((img, i) =>
    form.append(field, new Blob([new Uint8Array(img)], { type: "image/jpeg" }), `venue-${i + 1}.jpg`)
  );
  form.append("prompt", opts.prompt);
  form.append("size", opts.size);
  form.append("quality", opts.quality ?? env.renderQuality);
  form.append("output_format", "jpeg");
  form.append("n", "1");

  let res: Response;
  try {
    res = await fetch(`${env.openaiBaseUrl}/v1/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(240_000),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ImageModelError(
      timedOut ? "busy" : "failed",
      timedOut ? "Image model timed out" : `Image model unreachable: ${String(err)}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let code = "";
    let message = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      code = j?.error?.code ?? "";
      message = j?.error?.message ?? message;
    } catch {
      // keep raw text
    }
    if (code === "moderation_blocked" || /safety system/i.test(message)) {
      throw new ImageModelError("moderation", message);
    }
    if (res.status === 401 || res.status === 403) throw new ImageModelError("auth", message);
    if (res.status === 429 || res.status >= 500) throw new ImageModelError("busy", `${res.status}: ${message}`);
    throw new ImageModelError("failed", `${res.status}: ${message}`);
  }

  const json = await res.json().catch(() => null);
  const b64 = json?.data?.[0]?.b64_json;
  if (typeof b64 !== "string" || !b64) {
    throw new ImageModelError("failed", "Image model returned no image");
  }
  return { image: Buffer.from(b64, "base64"), usage: json?.usage ?? null };
}

// Gemini image-editing path. Uses Google AI Studio API with an API key.
// images[0] is the venue photo to edit; additional images are references.
async function editImageGemini(opts: {
  images: Buffer[];
  prompt: string;
}): Promise<EditResult> {
  const key = env.googleAiApiKeyIfSet;
  if (!key) throw new ImageModelError("auth", "GOOGLE_AI_API_KEY is not configured");

  // Build parts array: all images first (inlineData), then the text prompt.
  const parts: unknown[] = opts.images.map((img) => ({
    inlineData: { mimeType: "image/jpeg", data: img.toString("base64") },
  }));
  parts.push({ text: opts.prompt });

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiImageModel)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
        signal: AbortSignal.timeout(240_000),
      },
    );
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ImageModelError(
      timedOut ? "busy" : "failed",
      timedOut ? "Image model timed out" : `Image model unreachable: ${String(err)}`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      message = j?.error?.message ?? message;
    } catch { /* keep raw text */ }
    if (res.status === 401 || res.status === 403)
      throw new ImageModelError("auth", message);
    if (res.status === 429 || res.status >= 500)
      throw new ImageModelError("busy", `${res.status}: ${message}`);
    throw new ImageModelError("failed", `${res.status}: ${message}`);
  }

  const json = await res.json().catch(() => null);
  type GeminiPart = { inlineData?: { data?: string; mimeType?: string }; text?: string };
  const candidate = json?.candidates?.[0];
  const imagePart = (candidate?.content?.parts as GeminiPart[] | undefined)?.find(
    (p) => p.inlineData?.data,
  );
  if (!imagePart?.inlineData?.data) {
    throw new ImageModelError("failed", "Gemini returned no image");
  }
  return {
    image: Buffer.from(imagePart.inlineData.data, "base64"),
    usage: json?.usageMetadata ?? null,
  };
}

// Top-level router: picks the right provider based on whether it's a draft or
// hero render. Draft and refinements always use gpt-image-1 (fast/cheap). New
// hero renders use Gemini when HERO_IMAGE_PROVIDER=gemini is set.
export async function renderImage(opts: {
  images: Buffer[];
  prompt: string;
  size: string;
  provider?: "openai" | "gemini";
  draft?: boolean;
}): Promise<EditResult> {
  if (!opts.draft && opts.provider === "gemini") {
    return editImageGemini({ images: opts.images, prompt: opts.prompt });
  }
  // Draft mode uses low quality for speed; refinements/hero-openai use the env default.
  return editImage({
    images: opts.images,
    prompt: opts.prompt,
    size: opts.size,
    quality: opts.draft ? "low" : undefined,
  });
}
