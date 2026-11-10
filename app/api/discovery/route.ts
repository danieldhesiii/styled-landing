import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCatalogue } from "@/lib/server/catalogue";
import { loadPublicVenues } from "@/lib/server/venues";
import { clientIpHash } from "@/lib/server/limits";
import { lookupPostcode } from "@/lib/server/geocode";
import {
  milesBetween,
  validPoint,
  validPostcode,
  matchesPlace,
  type DiscoveryResults,
} from "@/lib/location";
export async function POST(req: Request) {
  const fail = (status: number, error: string) =>
    NextResponse.json({ ok: false, error }, { status });
  let body;
  try {
    const text = await req.text();
    if (text.length > 1000) return fail(413, "Request too large.");
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw Error();
  } catch {
    return fail(400, "Invalid location.");
  }
  const admin = createAdminClient();
  const { data: allowed, error: limitError } = await admin.rpc(
    "hit_rate_limit",
    {
      p_key: `discovery:${clientIpHash(req)}`,
      p_limit: 60,
      p_window_seconds: 3600,
    },
  );
  if (limitError)
    return fail(503, "Location matching is temporarily unavailable.");
  if (!allowed)
    return fail(429, "Please wait before checking another location.");
  try {
  let [items, venues] = await Promise.all([
    loadCatalogue(),
    loadPublicVenues(),
  ]);
  // Apply the same server-side supplier policy as venue-led catalogue browsing.
  if (typeof body.venueSlug === "string") {
    const { venueCatalogue } = await import("@/lib/server/venue-catalogue");
    items = (await venueCatalogue(body.venueSlug, items)).items;
  }
  const query = typeof body.query === "string" ? body.query : typeof body.postcode === "string" ? body.postcode : null;
  if (query !== null && !validPostcode(query) && typeof body.venueSlug !== "string") {
    if (query.trim().length < 2 || query.length > 160 || !/[a-z]/i.test(query) || /[\x00-\x1f]/.test(query))
      return fail(400, "Enter a place name or a full UK postcode.");
    const placeMatches: NonNullable<DiscoveryResults["placeMatches"]> = { suppliers: {}, venues: {} };
    for (const item of items)
      if (matchesPlace(query, item.supplierArea, item.supplierServiceArea))
        placeMatches.suppliers[item.supplierId] = [item.supplierArea, item.supplierServiceArea].filter(Boolean).join(" · ");
    for (const venue of venues)
      if (matchesPlace(query, venue.location, venue.county, `${venue.location} ${venue.county}`))
        placeMatches.venues[venue.slug] = [venue.location, venue.county].filter(Boolean).join(", ");
    return NextResponse.json({ ok: true, label: query.trim(), suppliers: {}, venues: {}, placeMatches },
      { headers: { "Cache-Control": "private,no-store" } });
  }
  const { data: locations, error } = await admin
      .from("discovery_locations")
      .select(
        "entity_type,entity_id,latitude,longitude,radius_miles,nationwide",
      );
  if (error) return fail(503, "Location matching is temporarily unavailable.");
  let point, label;
  try {
    if (typeof body.venueSlug === "string") {
      const venue = venues.find((v) => v.slug === body.venueSlug);
      if (!venue) return fail(404, "Venue not found.");
      const location = locations?.find(
        (l) => l.entity_type === "venue" && l.entity_id === venue.id,
      );
      if (!validPoint(location))
        return fail(
          422,
          "This venue’s location needs confirming. Enter its postcode to search nearby.",
        );
      point = { latitude: location.latitude, longitude: location.longitude };
      label = venue.name;
    } else if (query !== null) {
      point = await lookupPostcode(query);
      label = point.postcode;
    } else if (validPoint(body.point)) {
      point = body.point;
      label = "Your chosen location";
    } else return fail(400, "Choose a UK postcode or location.");
  } catch (e) {
    return fail(
      422,
      e instanceof Error ? e.message : "Could not locate that postcode.",
    );
  }
  const suppliers = new Set(items.map((i) => i.supplierId)),
    venueIds = new Map(venues.map((v) => [v.id, v.slug]));
  const result: DiscoveryResults = { label, suppliers: {}, venues: {} };
  for (const l of locations || []) {
    if (!validPoint(l)) continue;
    const distance = milesBetween(point, l);
    const match = {
      miles: Math.round(distance),
      delivery: l.nationwide
        ? ("nationwide" as const)
        : l.radius_miles == null
          ? ("unknown" as const)
          : distance <= l.radius_miles
            ? ("within_area" as const)
            : ("outside_area" as const),
    };
    if (l.entity_type === "supplier" && suppliers.has(l.entity_id))
      result.suppliers[l.entity_id] = match;
    if (l.entity_type === "venue" && venueIds.has(l.entity_id))
      result.venues[venueIds.get(l.entity_id)!] = match;
  }
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "Cache-Control": "private,no-store" } },
  );
  } catch {
    return fail(503, "Location matching is temporarily unavailable. Please try again.");
  }
}
