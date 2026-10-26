import { validateVenueTransition } from "@/lib/venue-workflow";
import {
  listingMissing,
  parseVenueResponse,
  validVenueDay,
} from "@/lib/venue-details";
import { londonToday } from "@/lib/server/venue-access";
import { notifyVenueRequest } from "@/lib/server/venue-notify";
import { NextResponse, after } from "next/server";
import { requireStaff } from "@/lib/server/staff";
import { parseVenue, parseVenuePackage } from "@/lib/venue-admin-input";
const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (id && !uuid(id)) return fail(400, "Invalid venue.");
  if (!id) {
    const { data, error } = await auth.admin
      .from("venue_listings")
      .select("*")
      .order("name");
    if (error) return fail(500, "Could not load venues.");
    const { data: drafts, error: de } = await auth.admin
      .from("venue_listing_drafts")
      .select("venue_id,status");
    if (de) return fail(503, "Could not load listing reviews.");
    return NextResponse.json({
      venues: data?.map((v) => ({
        ...v,
        review_status: drafts?.find((d) => d.venue_id === v.id)?.status || null,
      })),
    });
  }
  const [v, p, e, d, m, b] = await Promise.all([
    auth.admin.from("venue_listings").select("*").eq("id", id).maybeSingle(),
    auth.admin
      .from("venue_packages")
      .select("*")
      .eq("venue_id", id)
      .order("sort_order"),
    auth.admin
      .from("venue_enquiries")
      .select("*")
      .eq("venue_id", id)
      .order("created_at", { ascending: false }),
    auth.admin
      .from("venue_listing_drafts")
      .select("*")
      .eq("venue_id", id)
      .maybeSingle(),
    auth.admin.from("venue_users").select("user_id").eq("venue_id", id),
    auth.admin
      .from("venue_date_blocks")
      .select("day,note")
      .eq("venue_id", id)
      .gte("day", londonToday())
      .order("day"),
  ]);
  if (v.error || p.error || e.error || d.error || m.error || b.error)
    return fail(500, "Could not load venue details.");
  if (!v.data) return fail(404, "Venue not found.");
  return NextResponse.json({
    venue: v.data,
    packages: p.data,
    enquiries: e.data,
    draft: d.data,
    members: m.data,
    blocks: b.data,
  });
}
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return auth.response;
  let body;
  try {
    const text = await req.text();
    if (text.length > 50000) return fail(413, "Request too large.");
    body = JSON.parse(text);
  } catch {
    return fail(400, "Invalid request.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return fail(400, "Invalid request.");
  try {
    if (body.action === "saveVenue") {
      const value = parseVenue(body);
      if (value.active && listingMissing(value).length)
        return fail(
          422,
          `Before publishing, add: ${listingMissing(value).join(", ")}.`,
        );
      if (body.id && !uuid(body.id)) return fail(400, "Invalid venue.");
      const q = body.id
        ? auth.admin.from("venue_listings").update(value).eq("id", body.id)
        : auth.admin.from("venue_listings").insert(value);
      const { data, error } = await q.select("id").single();
      if (error)
        return fail(
          error.code === "23505" ? 409 : 500,
          error.code === "23505"
            ? "This URL slug is already in use."
            : "Could not save venue.",
        );
      return NextResponse.json({ ok: true, id: data.id });
    }
    if (!uuid(body.venueId)) return fail(400, "Invalid venue.");
    if (body.action === "approveDraft") {
      const { data: d, error: de } = await auth.admin
        .from("venue_listing_drafts")
        .select("*")
        .eq("venue_id", body.venueId)
        .eq("status", "submitted")
        .maybeSingle();
      if (de || !d) return fail(409, "No submitted draft to review.");
      const value = parseVenue({ ...d.payload, active: true });
      if (listingMissing(value).length)
        return fail(422, `Add: ${listingMissing(value).join(", ")}.`);
      const { error: save } = await auth.admin
        .from("venue_listings")
        .update(value)
        .eq("id", body.venueId);
      if (save) return fail(409, "Could not publish this draft.");
      const { error: clear } = await auth.admin
        .from("venue_listing_drafts")
        .delete()
        .eq("venue_id", body.venueId)
        .eq("updated_at", d.updated_at);
      if (clear)
        return fail(
          500,
          "Published, but the review queue could not be cleared. Reload before making another change.",
        );
    } else if (body.action === "addMember" || body.action === "removeMember") {
      if (!uuid(body.userId))
        return fail(422, "Enter an existing account user ID.");
      const { data: user, error } = await auth.admin.auth.admin.getUserById(
        body.userId,
      );
      if (
        error ||
        !user.user ||
        user.user.is_anonymous ||
        !user.user.email_confirmed_at
      )
        return fail(
          422,
          "Choose an existing account with a confirmed email address.",
        );
      const q =
        body.action === "addMember"
          ? auth.admin
              .from("venue_users")
              .upsert({ venue_id: body.venueId, user_id: body.userId })
          : auth.admin
              .from("venue_users")
              .delete()
              .eq("venue_id", body.venueId)
              .eq("user_id", body.userId);
      const { error: save } = await q;
      if (save) return fail(500, "Could not update venue team access.");
    } else if (body.action === "block") {
      if (
        !validVenueDay(body.day, londonToday()) ||
        typeof body.block !== "boolean"
      )
        return fail(422, "Choose a valid date.");
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (note.length > 300) return fail(422, "Please shorten the note.");
      const { error } = await auth.admin.rpc("set_venue_date_block", {
        p_venue_id: body.venueId,
        p_day: body.day,
        p_note: note || null,
        p_block: body.block,
      });
      if (error)
        return fail(
          409,
          "Could not change this date. Check confirmed bookings.",
        );
    } else if (body.action === "savePackage") {
      if (body.id && !uuid(body.id)) return fail(400, "Invalid package.");
      const value = parseVenuePackage(body);
      const q = body.id
        ? auth.admin
            .from("venue_packages")
            .update(value)
            .eq("id", body.id)
            .eq("venue_id", body.venueId)
        : auth.admin
            .from("venue_packages")
            .insert({ ...value, venue_id: body.venueId });
      const { error } = await q.select("id").single();
      if (error) return fail(500, "Could not save package.");
    } else if (body.action === "deletePackage") {
      if (!uuid(body.id)) return fail(400, "Invalid package.");
      const { error } = await auth.admin
        .from("venue_packages")
        .delete()
        .eq("id", body.id)
        .eq("venue_id", body.venueId);
      if (error)
        return fail(
          409,
          "This package is linked to an enquiry and cannot be deleted.",
        );
    } else if (body.action === "setEnquiryStatus") {
      if (!uuid(body.id)) return fail(400, "Choose a request.");
      const value = parseVenueResponse(body, londonToday());
      const { data: current, error: currentError } = await auth.admin.from("venue_enquiries")
        .select("request_kind,status").eq("id", body.id).eq("venue_id", body.venueId).maybeSingle();
      if (currentError) return fail(503, "Could not load the request status.");
      if (!current) return fail(404, "Request not found.");
      if (!validateVenueTransition(current.request_kind, current.status, value.status))
        return fail(409, "This status does not match the request type or the request is already confirmed or cancelled.");
      const { error } = await auth.admin.rpc("respond_venue_enquiry", {
        p_venue_id: body.venueId,
        p_id: body.id,
        p_status: value.status,
        p_response: value.response,
        p_dates: value.alternative_dates,
        p_viewing_time: value.viewing_time,
      });
      if (error)
        return fail(
          409,
          "Could not update this request. Check its status and blocked or confirmed dates.",
        );
      after(() => notifyVenueRequest(body.id, "response"));
    } else return fail(400, "Unknown action.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(422, e instanceof Error ? e.message : "Check your input.");
  }
}
