import "server-only";
import { DEMO_VENUES } from "@/lib/demo-venues";
import { createAdminClient } from "@/lib/supabase/admin";
import { validVenueDay } from "@/lib/venue-details";
import { createAnonClient } from "@/lib/supabase/anon";
import type { VenueListing, VenuePackage } from "@/lib/venues";

const publicFields =
  "id,slug,name,location,county,capacity_min,capacity_max,indoor_outdoor,description,hero_image,gallery_images,video_url,matterport_url,map_embed_url,package_from_pence,details";

export async function loadPublicVenues(date?: string): Promise<VenueListing[]> {
  const { data, error } = await createAnonClient()
    .from("venue_listings")
    .select(publicFields)
    .eq("active", true)
    .order("name");
  if (error) throw new Error(`Unable to load venues: ${error.message}`);
  if (!date) return data ?? [];
  if (!validVenueDay(date)) throw Error("Choose a valid date.");
  const admin = createAdminClient();
  const [booked, blocks] = await Promise.all([
    admin
      .from("venue_enquiries")
      .select("venue_id")
      .eq("preferred_date", date)
      .eq("status", "booked"),
    admin.from("venue_date_blocks").select("venue_id").eq("day", date),
  ]);
  if (booked.error || blocks.error) throw Error("Could not check venue dates.");
  const unavailable = new Set(
    [...(booked.data || []), ...(blocks.data || [])].map((v) => v.venue_id),
  );
  return (data ?? []).filter((v) => !unavailable.has(v.id));
}

export async function loadPublicVenue(slug: string): Promise<{
  venue: VenueListing;
  packages: VenuePackage[];
} | null> {
  const demo = DEMO_VENUES.find((venue) => venue.slug === slug);
  if (demo) return { venue: demo, packages: [] };
  const client = createAnonClient();
  const { data: venue, error } = await client
    .from("venue_listings")
    .select(publicFields)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`Unable to load venue: ${error.message}`);
  if (!venue) return null;
  const { data: packages, error: packageError } = await client
    .from("venue_packages")
    .select("id,venue_id,name,style_id,description,price_from_pence,sort_order")
    .eq("venue_id", venue.id)
    .order("sort_order")
    .order("name");
  if (packageError)
    throw new Error(`Unable to load venue packages: ${packageError.message}`);
  return { venue, packages: packages ?? [] };
}
