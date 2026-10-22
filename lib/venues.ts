// Public venue data. Enquiry contact details must never be included here.
export type VenueSetting = "indoor" | "outdoor" | "both";

export interface VenueListing {
  id: string;
  slug: string;
  name: string;
  location: string;
  county: string;
  capacity_min: number | null;
  capacity_max: number | null;
  indoor_outdoor: VenueSetting | null;
  description: string | null;
  hero_image: string | null;
  gallery_images: string[];
  video_url: string | null;
  matterport_url: string | null;
  map_embed_url: string | null;
  package_from_pence: number | null;
}

export interface VenuePackage {
  id: string;
  venue_id: string;
  name: string;
  style_id: string;
  description: string | null;
  price_from_pence: number;
  sort_order: number;
}

export type VenueEnquiryStatus = "new" | "contacted" | "booked" | "declined";

export function filterVenueListings(
  venues: VenueListing[],
  filters: { county: string; setting: string; guests: number },
) {
  return venues.filter(
    (venue) =>
      (!filters.county || venue.county === filters.county) &&
      (!filters.setting ||
        venue.indoor_outdoor === filters.setting ||
        venue.indoor_outdoor === "both") &&
      (!(filters.guests > 0) ||
        ((venue.capacity_min === null ||
          venue.capacity_min <= filters.guests) &&
          (venue.capacity_max === null ||
            venue.capacity_max >= filters.guests))),
  );
}
