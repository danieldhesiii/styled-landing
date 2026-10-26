import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.admin
    .from("support_requests")
    .select(
      "id,reference,account_email,topic,related_reference,message,status,reply,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return error
    ? json({ ok: false, error: "Could not load support requests." }, 503)
    : json({ ok: true, requests: data ?? [] });
}
export async function PATCH(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ ok: false, error: "Cross-site request refused." }, 403);
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  try {
    // Bound request size even if Content-Length is absent.
    const reader = req.body?.getReader();
    if (!reader) return json({ ok: false, error: "Enter a reply." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        return json({ ok: false, error: "Reply too long." }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.byteLength;
    }
    const b = JSON.parse(new TextDecoder().decode(bytes));
    if (
      !b ||
      typeof b.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(b.id) ||
      !["new", "in_progress", "resolved"].includes(b.status) ||
      typeof b.reply !== "string" ||
      b.reply.length > 4000 ||
      b.reply.includes("\0") ||
      typeof b.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(b.updatedAt))
    )
      return json({ ok: false, error: "Check the reply and status." }, 422);
    const { data, error } = await auth.admin
      .from("support_requests")
      .update({
        status: b.status,
        reply: b.reply.trim(),
        replied_by: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", b.id)
      .eq("updated_at", b.updatedAt)
      .select("id")
      .maybeSingle();
    if (error)
      return json({ ok: false, error: "Could not save this reply." }, 503);
    if (!data)
      return json(
        { ok: false, error: "This request changed. Refresh before saving." },
        409,
      );
    return json({ ok: true });
  } catch {
    return json(
      { ok: false, error: "Could not save. Refresh and try again." },
      400,
    );
  }
}
