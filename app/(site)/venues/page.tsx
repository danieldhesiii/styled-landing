import Link from "next/link";
import NearbyVenues from "@/components/venues/NearbyVenues";
import { filterVenueListings } from "@/lib/venues";
import { loadPublicVenues } from "@/lib/server/venues";
import {
  VenueCards,
  VenueOperatorCallout,
} from "@/components/venues/VenueCollection";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Wedding venues · Styled",
  description:
    "Explore wedding venues and discover styling packages for your day.",
};
export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const county = typeof params.county === "string" ? params.county : "";
  const setting = typeof params.setting === "string" ? params.setting : "";
  const guests = typeof params.guests === "string" ? Number(params.guests) : 0;
  let venues = null;
  try {
    venues = await loadPublicVenues();
  } catch (error) {
    console.error("[venues]", error);
  }
  const counties = [...new Set((venues ?? []).map((v) => v.county))].sort();
  const visible = filterVenueListings(venues ?? [], {
    county,
    setting,
    guests,
  });
  return (
    <div className="py-12 sm:py-20">
      <p className="text-xs uppercase tracking-widest text-clay">
        Your setting, your style
      </p>
      <h1 className="mt-3 max-w-3xl font-serif text-5xl text-ink sm:text-6xl">
        Find a place for your day
      </h1>
      <p className="mt-5 max-w-xl text-ink/60">
        Explore venues and styling options, then bring your ideas together in
        the design studio.
      </p>
      <form className="my-10 flex flex-wrap items-end gap-4 border-y border-sand py-6">
        <label className="text-sm">
          County
          <select
            name="county"
            defaultValue={county}
            className="mt-2 block rounded-lg border border-sand bg-cream p-3"
          >
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Setting
          <select
            name="setting"
            defaultValue={setting}
            className="mt-2 block rounded-lg border border-sand bg-cream p-3"
          >
            <option value="">Any setting</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
        </label>
        <label className="text-sm">
          Guests
          <input
            name="guests"
            type="number"
            min="1"
            max="10000"
            defaultValue={guests > 0 ? guests : ""}
            className="mt-2 block w-28 rounded-lg border border-sand bg-cream p-3"
          />
        </label>
        <button className="rounded-full bg-ink px-6 py-3 text-sm text-cream">
          Find venues
        </button>
        <Link href="/venues" className="px-3 py-3 text-sm underline">
          Clear filters
        </Link>
      </form>
      {!venues ? (
        <p role="status" className="py-12 text-ink/60">
          We couldn’t load our venues right now. Please try again shortly.
        </p>
      ) : visible.length === 0 ? (
        <p role="status" className="py-12 text-ink/60">
          {venues.length
            ? "No venues match these filters. Try a different county or guest count."
            : "Our venue collection is being prepared. Check back soon."}
        </p>
      ) : (
        <NearbyVenues venues={visible} />
      )}
      <VenueOperatorCallout />
    </div>
  );
}
