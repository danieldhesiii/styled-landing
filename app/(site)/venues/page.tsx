import DemoVenues from "@/components/venues/DemoVenues";
import Link from "next/link";
import NearbyVenues from "@/components/venues/NearbyVenues";
import { filterVenueListings } from "@/lib/venues";
import {
  VENUE_TYPES,
  VENUE_FEATURES,
  validVenueDay,
} from "@/lib/venue-details";
import { loadPublicVenues } from "@/lib/server/venues";
import { VenueOperatorCallout } from "@/components/venues/VenueCollection";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Find your wedding venue · Styled",
  description:
    "Explore wedding spaces, shortlist your favourites and request a viewing or venue booking through Styled.",
};
const field =
  "mt-2 block w-full rounded-lg border border-sand bg-white p-3 text-sm";
export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const str = (k: string) =>
    typeof params[k] === "string" ? (params[k] as string) : "";
  const county = str("county"),
    setting = str("setting"),
    query = str("q"),
    type = str("type"),
    date = str("date");
  const guests = Number(str("guests")) || 0,
    budget = Number(str("budget")) || 0;
  const raw = params.feature;
  const features = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((f) =>
    Object.prototype.hasOwnProperty.call(VENUE_FEATURES, f),
  );
  let venues = null;
  let all = null;
  let error = "";
  try {
    all = await loadPublicVenues();
    venues = date && validVenueDay(date) ? await loadPublicVenues(date) : all;
    if (date && !validVenueDay(date)) error = "Choose a valid wedding date.";
  } catch (e) {
    console.error("[venues]", e);
    error =
      "We could not load venues or check dates right now. Please try again shortly.";
  }
  const counties = [...new Set((all || []).map((v) => v.county))].sort();
  const visible = filterVenueListings(venues || [], {
    county,
    setting,
    guests,
    query,
    type,
    maxHirePence: budget > 0 ? Math.round(budget * 100) : 0,
    features,
  });
  const sort = str("sort");
  if (sort === "price")
    visible.sort(
      (a, b) =>
        (a.details?.hire_from_pence ?? Infinity) -
        (b.details?.hire_from_pence ?? Infinity),
    );
  else if (sort === "capacity")
    visible.sort((a, b) => (b.capacity_max || 0) - (a.capacity_max || 0));
  return (
    <div className="py-10 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            The place it all begins
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl sm:text-6xl">
            Find a place for your day
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-ink/60">
            Discover the spaces that suit your plans. Save a shortlist, take a
            look around and request a viewing or booking directly through
            Styled.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/venues/requests"
            className="rounded-full border border-sand px-5 py-3 text-sm"
          >
            My venue requests
          </Link>
          <Link
            href="/venues/partner"
            className="rounded-full bg-ink px-5 py-3 text-sm text-cream"
          >
            List a venue
          </Link>
        </div>
      </div>
      <form className="my-8 rounded-2xl border border-sand bg-white p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            Venue name or location
            <input
              name="q"
              defaultValue={query}
              placeholder="Town, county or venue"
              maxLength={150}
              className={field}
            />
          </label>
          <label className="text-sm">
            County
            <select name="county" defaultValue={county} className={field}>
              <option value="">All counties</option>
              {counties.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Wedding guests
            <input
              name="guests"
              type="number"
              min="1"
              max="10000"
              defaultValue={guests || ""}
              className={field}
            />
          </label>
          <label className="text-sm">
            Wedding date
            <input
              name="date"
              type="date"
              defaultValue={date}
              className={field}
            />
          </label>
        </div>
        <details
          className="mt-5 border-t border-sand pt-4"
          open={!!(type || setting || budget || features.length)}
        >
          <summary className="cursor-pointer text-sm">
            More filters: venue type, hire budget & facilities
          </summary>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              Venue type
              <select name="type" defaultValue={type} className={field}>
                <option value="">Any venue type</option>
                {Object.entries(VENUE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Setting
              <select name="setting" defaultValue={setting} className={field}>
                <option value="">Any setting</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </label>
            <label className="text-sm">
              Maximum starting hire price (£)
              <input
                name="budget"
                type="number"
                min="1"
                defaultValue={budget || ""}
                className={field}
              />
            </label>
            <label className="text-sm">
              Sort by
              <select name="sort" defaultValue={sort} className={field}>
                <option value="">Venue name</option>
                <option value="price">Starting hire price</option>
                <option value="capacity">Largest guest capacity</option>
              </select>
            </label>
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm">Facilities that matter to you</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(VENUE_FEATURES).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="feature"
                    value={k}
                    defaultChecked={features.includes(k)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="mt-4 text-xs leading-relaxed text-ink/60">
            Starting venue hire prices exclude styling unless the venue states
            otherwise. A budget filter shows venues with a published starting
            price. Ask the venue about your date, full inclusions and access
            requirements.
          </p>
        </details>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <button className="rounded-full bg-ink px-6 py-3 text-sm text-cream">
            Find venues
          </button>
          <Link href="/venues" className="text-sm underline">
            Clear filters
          </Link>
          <p className="text-xs text-ink/60">
            Date searches exclude known booked and blocked dates. All dates need
            venue confirmation.
          </p>
        </div>
      </form>
      {error ? (
        <p role="alert" className="rounded-xl border border-clay p-6 text-sm">
          {error}
        </p>
      ) : visible.length ? (
        <NearbyVenues venues={visible} requestDate={date} guestCount={guests} />
      ) : (
        <section className="rounded-2xl bg-white p-8 sm:p-12">
          <h2 className="font-serif text-3xl">
            {all?.length
              ? "No spaces match these plans yet"
              : "Our first venue collection is taking shape"}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/60">
            {all?.length
              ? "Try a nearby county, another date or fewer filters."
              : "We are onboarding venues and checking their listings. Already have a venue? You can keep planning with your own photos in the studio."}
          </p>
          <div className="mt-6 flex flex-wrap gap-5">
            <Link href="/design?tab=venues" className="text-sm underline">
              Continue planning your wedding →
            </Link>
            <Link href="/venues/partner" className="text-sm underline">
              I manage a venue →
            </Link>
          </div>
        </section>
      )}
      <section className="mt-12 grid gap-6 border-y border-sand py-8 sm:grid-cols-3">
        {[
          [
            "Explore & shortlist",
            "Compare spaces, guest capacities, hire information and facilities.",
          ],
          [
            "Visit your favourites",
            "Browse photos and captured walkthroughs, or request an in-person viewing.",
          ],
          [
            "Request your date",
            "The venue confirms your plans manually. Contracts and payment are agreed separately.",
          ],
        ].map(([h, p], i) => (
          <div key={h}>
            <p className="text-xs text-clay">0{i + 1}</p>
            <h2 className="mt-2 font-serif text-2xl">{h}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/60">{p}</p>
          </div>
        ))}
      </section>
      <DemoVenues />
      <VenueOperatorCallout />
    </div>
  );
}
