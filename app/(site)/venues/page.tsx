import Link from "next/link";
import NearbyVenues from "@/components/venues/NearbyVenues";
import { VENUE_FEATURES } from "@/lib/venue-details";
import { loadPublicVenues } from "@/lib/server/venues";
import type { VenueListing } from "@/lib/venues";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Find your wedding venue · Styled",
  description:
    "Explore wedding spaces, shortlist your favourites and plan a venue choice for your wedding.",
};
export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const str = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const raw = params.feature;
  const features = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(
    (feature) => Object.prototype.hasOwnProperty.call(VENUE_FEATURES, feature),
  );
  let venues: VenueListing[] | undefined;
  let error = "";
  try {
    // Keep public venue cards in the server response for discovery. The shared
    // search checks any requested date through GET /api/venues?date=.
    venues = await loadPublicVenues();
  } catch {
    error = "We could not load venues. Please try again.";
  }
  return (
    <div className="py-6 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-clay">
            For couples & event planners
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl sm:text-6xl">
            Find a venue
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60 sm:mt-5 sm:text-base">
            Save your favourites or ask the venue about dates.
          </p>
        </div>
        <Link
          href="/design?tab=orders&bookings=venues"
          className="rounded-full border border-sand px-5 py-3 text-sm"
        >
          Venue requests
        </Link>
      </div>
      <NearbyVenues
        venues={venues}
        initialError={error}
        initialFilters={{
          q: str("q"),
          county: str("county"),
          guests: str("guests"),
          date: str("date"),
          type: str("type"),
          setting: str("setting"),
          budget: str("budget"),
          features,
          sort: str("sort"),
        }}
      />
    </div>
  );
}
