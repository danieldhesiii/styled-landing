import "server-only";
import { createAnonClient } from "@/lib/supabase/anon";
import type { VenueListing, VenuePackage } from "@/lib/venues";

const publicFields =
  "id,slug,name,location,county,capacity_min,capacity_max,indoor_outdoor,description,hero_image,gallery_images,video_url,matterport_url,map_embed_url,package_from_pence";

export async function loadPublicVenues(): Promise<VenueListing[]> {
  const { data, error } = await createAnonClient()
    .from("venue_listings")
    .select(publicFields)
    .eq("active", true)
    .order("name");
  if (error) throw new Error(`Unable to load venues: ${error.message}`);
  return data ?? [];
}

export async function loadPublicVenue(slug: string): Promise<{
  venue: VenueListing;
  packages: VenuePackage[];
} | null> {
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
