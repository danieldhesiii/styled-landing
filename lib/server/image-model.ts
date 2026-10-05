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
  form.append("quality", env.renderQuality);
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
