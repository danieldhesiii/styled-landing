import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { env } from "@/lib/server/env";
import { sendEmail } from "@/lib/server/notify";
import {
  SUPPORT_EMAIL,
  SUPPORT_TOPICS,
  supportDraft,
  supportEmailBody,
} from "@/lib/support";

export const runtime = "nodejs";
// A bounded, per-instance throttle in addition to real account authentication.
// No new customer tables, stock changes or background jobs are needed.
const attempts = new Map<string, { count: number; until: number }>();
const fail = (status: number, error: string) =>
  NextResponse.json(
    { ok: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return fail(403, "Open Support on the Styled website to send a message.");
  if (!req.headers.get("content-type")?.includes("application/json"))
    return fail(415, "Send a valid support message.");
  try {
    const auth = await requireUser();
    if (
      !auth.ok ||
      auth.user.is_anonymous ||
      !auth.user.email ||
      !auth.user.email_confirmed_at
    )
      return fail(
        401,
        "Sign in to a confirmed account to send here, or email support@styleduk.com directly. Your draft is still here.",
      );
    if (Number(req.headers.get("content-length")) > 20000)
      return fail(413, "Please shorten your message.");
    const reader = req.body?.getReader();
    if (!reader) return fail(400, "Enter your message.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        return fail(413, "Please shorten your message.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return fail(400, "Enter a valid support message.");
    }
    const draft = supportDraft(parsed);
    if (!draft)
      return fail(
        422,
        "Choose a topic and enter 10 to 4,000 characters. Keep the reference under 120 characters.",
      );
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (entry.until <= now) attempts.delete(key);
    }
    const entry = attempts.get(auth.user.id);
    if ((entry?.count ?? 0) >= 3 || (!entry && attempts.size >= 2000))
      return fail(
        429,
        "Please wait a little before sending another message, or email support@styleduk.com.",
      );
    attempts.set(auth.user.id, {
      count: (entry?.count ?? 0) + 1,
      until: entry?.until ?? now + 10 * 60 * 1000,
    });
    const reference = `SUP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const text = `Support reference: ${reference}\nReply to: ${auth.user.email}\n\n${supportEmailBody(draft)}`;
    const sent = await sendEmail({
      to: [SUPPORT_EMAIL],
      replyTo: auth.user.email,
      subject: `[${reference}] ${SUPPORT_TOPICS[draft.topic]}`,
      text,
      html: `<pre style="white-space:pre-wrap;font-family:sans-serif">${escape(text)}</pre>`,
    });
    if (!sent)
      return fail(
        503,
        "We could not send your message. Your draft is still here. Please try again later or use the email option below.",
      );
    return NextResponse.json(
      { ok: true, reference },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return fail(
      503,
      "Support is temporarily unavailable. Your draft is still here. Email support@styleduk.com instead.",
    );
  }
}

export function GET() {
  return NextResponse.json(
    { emailEnabled: !!(env.brevoApiKeyIfSet || env.resendApiKeyIfSet) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
