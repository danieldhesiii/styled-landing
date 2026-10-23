import { validateVenueTransition } from "@/lib/venue-workflow";
import { NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import {
  requireVenueAccount,
  venueUuid,
  londonToday,
} from "@/lib/server/venue-access";
import { parseVenue } from "@/lib/venue-admin-input";
import {
  listingMissing,
  parseVenueResponse,
  validVenueDay,
} from "@/lib/venue-details";
import { notifyVenueRequest } from "@/lib/server/venue-notify";
const fail = (s: number, error: string) =>
  NextResponse.json({ error }, { status: s });
export async function GET(req: Request) {
  const auth = await requireVenueAccount(req);
  if (!auth.ok) return auth.response;
  const { data: links, error } = await auth.admin
    .from("venue_users")
    .select("venue_id")
    .eq("user_id", auth.user.id);
  if (error) return fail(503, "Could not load your venue access.");
  const ids = (links || []).map((x) => x.venue_id);
  if (!ids.length) return NextResponse.json({ venues: [] });
  const { data: venues, error: ve } = await auth.admin
    .from("venue_listings")
    .select("*")
    .in("id", ids)
    .order("name");
  if (ve) return fail(503, "Could not load your venues.");
  const id = new URL(req.url).searchParams.get("venueId") || ids[0];
  if (!ids.includes(id)) return fail(404, "Venue not found.");
  const [draft, requests, blocks] = await Promise.all([
    auth.admin
      .from("venue_listing_drafts")
      .select("*")
      .eq("venue_id", id)
      .maybeSingle(),
    auth.admin
      .from("venue_enquiries")
      .select(
        "id,name,email,phone,guest_count,preferred_date,viewing_time,next_actor,message,status,request_kind,response,alternative_dates,responded_at,created_at",
      )
      .eq("venue_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    auth.admin
      .from("venue_date_blocks")
      .select("day,note")
      .eq("venue_id", id)
      .gte("day", londonToday())
      .order("day"),
  ]);
  if (draft.error || requests.error || blocks.error)
    return fail(503, "Could not load venue details.");
  return NextResponse.json(
    {
      venues,
      venue: venues?.find((v) => v.id === id),
      draft: draft.data,
      requests: requests.data,
      blocks: blocks.data,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: Request) {
  const auth = await requireVenueAccount(req);
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 50000) return fail(413, "Please shorten your listing.");
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return fail(400, "Invalid request.");
  } catch {
    return fail(400, "Invalid request.");
  }
  const { data: allowed, error: limitError } = await auth.admin.rpc(
    "hit_rate_limit",
    {
      p_key: `venue-owner:${auth.user.id}`,
      p_limit: 60,
      p_window_seconds: 3600,
    },
  );
  if (limitError) return fail(503, "Please try again shortly.");
  if (allowed !== true)
    return fail(429, "Please wait before making more changes.");
  try {
    if (body.action === "create") {
      const { count, error } = await auth.admin
        .from("venue_users")
        .select("venue_id", { count: "exact", head: true })
        .eq("user_id", auth.user.id);
      if (error) throw error;
      if ((count || 0) >= 3)
        return fail(
          422,
          "Contact support@styleduk.com to add more than three venues.",
        );
      const slug = `${
        String(body.name || "venue")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80) || "venue"
      }-${randomUUID().slice(0, 8)}`;
      const value = parseVenue({ ...body, slug, active: false });
      const { data: created, error: ce } = await auth.admin
        .from("venue_listings")
        .insert(value)
        .select("id")
        .single();
      if (ce) throw ce;
      const { error: le } = await auth.admin
        .from("venue_users")
        .insert({ venue_id: created.id, user_id: auth.user.id });
      if (le) {
        await auth.admin
          .from("venue_listings")
          .delete()
          .eq("id", created.id)
          .eq("active", false);
        throw le;
      }
      return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
    }
    if (!venueUuid(body.venueId)) return fail(400, "Choose a venue.");
    const id = body.venueId;
    const { data: link, error: le } = await auth.admin
      .from("venue_users")
      .select("venue_id")
      .eq("venue_id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (le) throw le;
    if (!link) return fail(404, "Venue not found.");
    if (body.action === "save" || body.action === "submit") {
      const { data: live, error } = await auth.admin
        .from("venue_listings")
        .select("slug")
        .eq("id", id)
        .single();
      if (error) throw error;
      const value = parseVenue({ ...body, slug: live.slug, active: false });
      const missing = listingMissing(value);
      if (body.action === "submit" && missing.length)
        return fail(422, `Before submitting, add: ${missing.join(", ")}.`);
      const { error: save } = await auth.admin
        .from("venue_listing_drafts")
        .upsert({
          venue_id: id,
          payload: value,
          status: body.action === "submit" ? "submitted" : "draft",
          updated_at: new Date().toISOString(),
        });
      if (save) return fail(503, "Could not save your draft. Your edits are still in this form.");
    } else if (body.action === "respond") {
      if (!venueUuid(body.id)) return fail(400, "Choose a request.");
      const value = parseVenueResponse(body, londonToday());
      const { data: current, error: currentError } = await auth.admin.from("venue_enquiries")
        .select("request_kind,status").eq("id", body.id).eq("venue_id", id).maybeSingle();
      if (currentError) return fail(503, "Could not load the request status.");
      if (!current) return fail(404, "Request not found.");
      if (!validateVenueTransition(current.request_kind, current.status, value.status))
        return fail(409, "This status does not match the request type or the request is already confirmed or cancelled.");
      const { error } = await auth.admin.rpc("respond_venue_enquiry", {
        p_venue_id: id,
        p_id: body.id,
        p_status: value.status,
        p_response: value.response,
        p_dates: value.alternative_dates,
        p_viewing_time: value.viewing_time,
      });
      if (error)
        return fail(
          409,
          error.code === "23505"
            ? "This date already has a confirmed booking."
            : "Could not update this request. Check the date, request status and blocked dates.",
        );
      const requestId = body.id;
      after(() => notifyVenueRequest(requestId, "response"));
    } else if (body.action === "block") {
      if (
        !validVenueDay(body.day, londonToday()) ||
        (body.block !== true && body.block !== false)
      )
        return fail(422, "Choose a valid future date.");
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (note.length > 300)
        return fail(422, "Keep your note under 300 characters.");
      const { error } = await auth.admin.rpc("set_venue_date_block", {
        p_venue_id: id,
        p_day: body.day,
        p_note: note || null,
        p_block: body.block,
      });
      if (error)
        return fail(
          409,
          "Could not change this date. It may already have a confirmed booking.",
        );
    } else return fail(400, "Unknown action.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[venue portal]", e);
    return fail(
      422,
      e instanceof Error
        ? e.message
        : "Could not save this change. Please try again.",
    );
  }
}
