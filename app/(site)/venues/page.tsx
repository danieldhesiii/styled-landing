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
    <div className="py-10 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            The place it all begins
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl sm:text-6xl">
            Find a venue
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-ink/60">
            Discover spaces that suit your plans. Save a shortlist, explore your
            favourites and keep your planned venue with your wedding.
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
