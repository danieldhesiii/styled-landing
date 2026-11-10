import type { VenueListing } from "./venues";
import { EMPTY_VENUE_POLICY, type VenueSupplierMode } from "./venue-suppliers";
import { EMPTY_VENUE_DETAILS } from "./venue-details";

// Code-only practice fixtures. Never inserted into real listings, enquiries or date searches.
export const DEMO_VENUES: VenueListing[] = [
  {
    slug: "demo-oak-barn",
    name: "The Oak Barn",
    county: "Essex",
    image: "oak_barn.png",
    type: "barn",
    capacity: 120,
    mode: "venue_only",
    hire: 350000,
    description:
      "A fictional countryside barn with timber beams and space for a relaxed reception. This preview shows how photographs, facilities, a venue film and a 3D walkthrough will sit together on a venue listing.",
  },
  {
    slug: "demo-manor-orangery",
    name: "The Manor Orangery",
    county: "Hertfordshire",
    image: "manor_orangery.png",
    type: "country_house",
    capacity: 160,
    mode: "venue_partners",
    hire: 650000,
    description:
      "An illustrative light-filled orangery with a garden setting. Explore this sample listing to see where a venue team will add photographs, video and an interactive walkthrough.",
  },
  {
    slug: "demo-city-hall",
    name: "The City Hall",
    county: "London",
    image: "county_hall.jpg",
    type: "city",
    capacity: 90,
    mode: "styled",
    hire: 250000,
    description:
      "A fictional city celebration space. This listing demonstrates the customer experience while real venue partners are being onboarded. Its imagery and capacities are illustrative.",
  },
].map((v) => ({
  id: v.slug,
  slug: v.slug,
  name: v.name,
  is_demo: true,
  county: v.county,
  location: `${v.county} · Illustrative location`,
  capacity_min: 20,
  capacity_max: v.capacity,
  indoor_outdoor: "both",
  description: v.description,
  hero_image: `/img/venues/${v.image}`,
  gallery_images: [`/img/venues/${v.image}`],
  video_url: null,
  matterport_url: null,
  map_embed_url: null,
  package_from_pence: null,
  details: {
    ...EMPTY_VENUE_DETAILS,
    venue_type: v.type,
    features: ["exclusive_use", "accessible"],
    hire_from_pence: v.hire,
    supplier_policy: {...EMPTY_VENUE_POLICY, mode: v.mode as VenueSupplierMode,
      bookingNotes: "Practice requests only. This fictional venue does not accept real bookings.",
      localNotes: "Example preference: local suppliers within 25 miles where possible.",
      suppliers: [
        {name:"Meadow Florals (example)",category:"Flowers & styling",location:v.county,postcode:"",website:""},
        {name:"Gather Hire (example)",category:"Furniture & tableware",location:v.county,postcode:"",website:""},
      ],
    },
    pricing_notes:
      "Illustrative hire price only, including use of the main event space. Catering, styling and accommodation are separate. No real quote or booking is offered.",
  },
}));
