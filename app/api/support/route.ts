import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { createAdminClient } from "@/lib/supabase/admin";

import { supportDraft } from "@/lib/support";

export const runtime = "nodejs";
const fail = (status: number, error: string) =>
  NextResponse.json(
    { ok: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
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
    const clientId = (parsed as { clientId?: unknown }).clientId;
    if (
      typeof clientId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        clientId,
      )
    )
      return fail(
        422,
        "Refresh Support and try again. Your draft is still here.",
      );
    const { data: reference, error } = await createAdminClient().rpc(
      "submit_support_request",
      {
        p_user: auth.user.id,
        p_email: auth.user.email,
        p_client: clientId,
        p_topic: draft.topic,
        p_related: draft.reference,
        p_message: draft.message,
      },
    );
    if (error?.message?.includes("support_rate_limit"))
      return fail(
        429,
        "Please wait ten minutes before submitting another request, or email support@styleduk.com.",
      );
    if (error || typeof reference !== "string")
      return fail(
        503,
        "Your request could not be saved. Your draft is still here. Try again or use email below.",
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

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok || auth.user.is_anonymous || !auth.user.email_confirmed_at)
      return fail(401, "Sign in to see your support requests.");
    const { data, error } = await auth.supabase
      .from("support_requests")
      .select(
        "reference,topic,related_reference,message,status,reply,created_at,updated_at",
      )
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error)
      return fail(503, "Could not load your requests. Please try again.");
    return NextResponse.json(
      { ok: true, requests: data ?? [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return fail(503, "Could not load your requests. Please try again.");
  }
}
