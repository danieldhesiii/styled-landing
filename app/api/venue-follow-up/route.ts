import { NextResponse } from "next/server";
import { requireVenueAccount, venueUuid, londonToday } from "@/lib/server/venue-access";
import { venueParticipant, validateAlternative } from "@/lib/venue-workflow";
import { validVenueDay } from "@/lib/venue-details";
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

async function access(req: Request, id: unknown) {
  const auth = await requireVenueAccount(req);
  if (!auth.ok) return auth;
  if (!venueUuid(id)) return { ok: false as const, response: fail(400, "Choose a request.") };
  // Use the signed-in client: RLS limits this lookup to the customer or venue team.
  const { data: request, error } = await auth.supabase.from("venue_enquiries")
    .select("id,venue_id,owner_user_id,status,alternative_dates,next_actor").eq("id", id).maybeSingle();
  if (error) return { ok: false as const, response: fail(503, "Could not load this conversation.") };
  if (!request) return { ok: false as const, response: fail(404, "Request not found.") };
  const { data: member, error: me } = await auth.supabase.from("venue_users")
    .select("venue_id").eq("venue_id", request.venue_id).eq("user_id", auth.user.id).maybeSingle();
  if (me) return { ok: false as const, response: fail(503, "Could not check conversation access.") };
  const participant = venueParticipant(auth.user.id, request.owner_user_id, !!member);
  if (!participant) return { ok: false as const, response: fail(404, "Request not found.") };
  return { ...auth, request, participant };
}
export async function GET(req: Request) {
  const auth = await access(req, new URL(req.url).searchParams.get("id"));
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.from("venue_request_messages")
    .select("id,body,sender_kind,created_at").eq("request_id", auth.request.id)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100);
  if (error) return fail(503, "Could not load messages. Try again shortly.");
  return NextResponse.json({ messages: (data || []).reverse(), nextActor: auth.request.next_actor }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  // Authenticate and check origin before reading any body or checking identifiers.
  const session = await requireVenueAccount(req);
  if (!session.ok) return session.response;
  let body;
  try {
    const text = await req.text();
    if (text.length > 10000) return fail(413, "Please shorten your message.");
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "Invalid request.");
  } catch { return fail(400, "Invalid request."); }
  const auth = await access(req, body.id);
  if (!auth.ok) return auth.response;
  const { data: allowed, error: limitError } = await auth.admin.rpc("hit_rate_limit", {
    p_key: `venue-follow-up:${auth.user.id}`, p_limit: 60, p_window_seconds: 3600,
  });
  if (limitError) return fail(503, "Please try again shortly.");
  if (allowed !== true) return fail(429, "Please wait before sending more updates.");
  if (body.action === "alternative") {
    if (auth.participant !== "customer") return fail(403, "Only the customer can request an alternative.");
    if (!validVenueDay(body.date, londonToday()) || !validateAlternative(auth.request, body.date))
      return fail(409, "Choose a suggested future date on an unconfirmed request.");
    const { error } = await auth.admin.rpc("request_venue_alternative", {
      p_id: auth.request.id, p_user_id: auth.user.id, p_day: body.date,
    });
    if (error) return fail(409, "Could not request this date. Reload to check current suggestions and availability.");
  } else if (body.action === "message") {
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 3000) return fail(422, "Write a message of up to 3,000 characters.");
    const { error } = await auth.admin.rpc("send_venue_request_message", {
      p_id: auth.request.id, p_user_id: auth.user.id, p_body: message,
    });
    if (error) return fail(409, "Could not send this message. Reload to check the request is still open.");
  } else return fail(400, "Unknown action.");
  return NextResponse.json({ ok: true });
}
