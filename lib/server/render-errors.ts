// Render failures are stored with a short machine-readable kind. Couples only
// ever see these friendly messages, never provider error text.

export type RenderErrorKind = "moderation" | "busy" | "timeout" | "failed";

export const RENDER_ERROR_MESSAGES: Record<RenderErrorKind, string> = {
  moderation: "That request couldn't be styled. Try describing it a different way.",
  busy: "The render engine is busy. Please try again in a minute.",
  timeout: "That took too long and was stopped. Please try again.",
  failed: "Something went wrong creating your render. Please try again.",
};

export function friendlyRenderError(kind: string | null | undefined): string {
  return RENDER_ERROR_MESSAGES[(kind as RenderErrorKind) ?? "failed"] ?? RENDER_ERROR_MESSAGES.failed;
}

// A render still "running" after this long has crashed or been killed.
export const STALE_RENDER_MINUTES = 6;

// Keep stored error text useful for debugging without credentials in it.
export function sanitiseErrorText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{6,}/g, "sk-[redacted]")
    .slice(0, 300);
}
