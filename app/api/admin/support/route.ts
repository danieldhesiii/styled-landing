import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const params = new URL(req.url).searchParams;
  const status = params.get("status") || "open";
  const page = Math.max(0, Math.min(10000, Number(params.get("page")) || 0));
  if (!["open", "all", "new", "in_progress", "resolved"].includes(status))
    return json({ ok: false, error: "Choose a valid support status." }, 422);
  let query = auth.admin.from("support_requests")
    .select("id,reference,account_email,topic,related_reference,message,status,reply,created_at,updated_at")
    .order("created_at", { ascending: false }).order("id");
  if (status === "open") query = query.in("status", ["new", "in_progress"]);
  else if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query.range(page * 100, page * 100 + 100);
  if (error) return json({ ok: false, error: "Could not load support requests." }, 503);
  const requests = (data || []).slice(0, 100);
  // Notification schema/provider failures must never hide the saved inbox.
  const jobs = requests.length ? await auth.admin.from("support_notifications")
    .select("id,request_id,status,attempts,last_error,attempted_at")
    .in("request_id", requests.map(r => r.id)) : { data: [], error: null };
  const deliveries = jobs.data?.length ? await auth.admin.from("booking_email_deliveries")
    .select("support_job_id,status,message_id,delivered_at,created_at")
    .in("support_job_id", jobs.data.map(j => j.id)).order("created_at", { ascending: false }) : { data: [], error: null };
  return json({ ok: true, hasMore: (data || []).length > 100,
    notificationWarning: jobs.error || deliveries.error ? "Notification tracking is unavailable. Saved requests remain available; check the development migration and provider setup." : null,
    requests: requests.map(r => {
      const job = jobs.data?.find(j => j.request_id === r.id);
      return { ...r, notification: job ? { ...job, delivery: deliveries.data?.find(d => d.support_job_id === job.id) || null } : null };
    }) });
}
// Requeue only definite failures that still have attempts available. Never send
// from an admin click or reset the attempt budget/possibly accepted jobs.
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ ok: false, error: "Cross-site request refused." }, 403);
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  try {
    const b = await req.json();
    if (!b || typeof b.id !== "string" || !/^[0-9a-f-]{36}$/i.test(b.id))
      return json({ ok: false, error: "Choose a valid notification." }, 422);
    const { data, error } = await auth.admin.from("support_notifications")
      .update({ status: "queued", due_at: new Date().toISOString(), last_error: null })
      .eq("id", b.id).in("status", ["blocked", "failed"]).lt("attempts", 5).select("id");
    if (error) return json({ ok: false, error: "Could not queue this notification." }, 503);
    if (!data?.length) return json({ ok: false, error: "This notification is held for review or has changed. Refresh the inbox." }, 409);
    return json({ ok: true });
  } catch { return json({ ok: false, error: "Choose a valid notification." }, 400); }
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
