// Public venue data. Enquiry contact details must never be included here.
export type VenueSetting = "indoor" | "outdoor" | "both";

export interface VenueListing {
  is_demo?: boolean;
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
  details?: import("./venue-details").VenueDetails;
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
  filters: {
    county: string;
    setting: string;
    guests: number;
    query?: string;
    type?: string;
    maxHirePence?: number;
    features?: string[];
  },
) {
  return venues.filter(
    (venue) =>
      (!filters.query ||
        `${venue.name} ${venue.location} ${venue.county}`
          .toLowerCase()
          .includes(filters.query.toLowerCase())) &&
      (!filters.type || venue.details?.venue_type === filters.type) &&
      (!filters.maxHirePence ||
        (venue.details?.hire_from_pence != null &&
          venue.details.hire_from_pence <= filters.maxHirePence)) &&
      (!filters.features?.length ||
        filters.features.every((f) => venue.details?.features?.includes(f))) &&
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
