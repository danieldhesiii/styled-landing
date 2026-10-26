"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { filterVenueListings, type VenueListing } from "@/lib/venues";
import {
  VENUE_FEATURES,
  VENUE_TYPES,
  validVenueDay,
} from "@/lib/venue-details";
import type { DiscoveryMatch, DiscoveryResults } from "@/lib/location";
import LocationFilter from "@/components/wedding/LocationFilter";
import { VenueCards } from "./VenueCollection";
import { readVenueShortlist } from "./VenueShortlist";
import DemoVenues from "./DemoVenues";

export type VenueSearchFilters = {
  q: string;
  county: string;
  guests: string;
  date: string;
  type: string;
  setting: string;
  budget: string;
  features: string[];
  sort: string;
};
const emptyFilters: VenueSearchFilters = {
  q: "",
  county: "",
  guests: "",
  date: "",
  type: "",
  setting: "",
  budget: "",
  features: [],
  sort: "",
};
const field =
  "mt-2 block w-full rounded-lg border border-sand bg-white px-3 py-3 text-sm";

export default function VenueSearch({
  active = true,
  initialVenues,
  initialError = "",
  initialFilters,
  guestCount,
  weddingDate,
  postcode = "",
  matches,
  searchRadius = 50,
  selectedSlug,
  onSelect,
  onVisualise,
  syncUrl = false,
}: {
  active?: boolean;
  initialVenues?: VenueListing[];
  initialError?: string;
  initialFilters?: Partial<VenueSearchFilters>;
  guestCount?: number;
  /** Plan values seed the search on mount, preserving subsequent manual choices. */
  weddingDate?: string;
  postcode?: string;
  matches?: Record<string, DiscoveryMatch>;
  searchRadius?: number;
  selectedSlug?: string;
  onSelect?: (venue: VenueListing) => void;
  onVisualise?: () => void;
  syncUrl?: boolean;
}) {
  const [filters, setFilters] = useState<VenueSearchFilters>(() => ({
    ...emptyFilters,
    guests: guestCount ? String(guestCount) : "",
    date: weddingDate || "",
    ...initialFilters,
  }));
  const [catalogue, setCatalogue] = useState(initialVenues || []);
  const [collectionKnown, setCollectionKnown] = useState(
    initialVenues !== undefined,
  );
  const [loaded, setLoaded] = useState<{
    date: string;
    venues: VenueListing[];
  } | null>(initialVenues ? { date: "", venues: initialVenues } : null);
  const [failure, setFailure] = useState({
    date: filters.date,
    message: initialError,
  });
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<DiscoveryResults | null>(null);
  const [radius, setRadius] = useState(searchRadius);
  const [locationPostcode, setLocationPostcode] = useState(postcode);
  const [ignoreParentLocation, setIgnoreParentLocation] = useState(false);
  const [locationRevision, setLocationRevision] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const date = filters.date;
  const invalidDate = !!date && !validVenueDay(date);
  const error = failure.date === date ? failure.message : "";
  const loading =
    active && !invalidDate && !error && (busy || loaded?.date !== date);

  useEffect(() => {
    if (guestCount !== undefined) {
      setFilters((current) => ({
        ...current,
        guests: guestCount ? String(guestCount) : "",
      }));
    }
  }, [guestCount]);
  useEffect(() => setRadius(searchRadius), [searchRadius]);
  useEffect(() => {
    if (weddingDate !== undefined)
      setFilters((current) => ({ ...current, date: weddingDate }));
  }, [weddingDate]);
  useEffect(() => setLocationPostcode(postcode), [postcode]);
  useEffect(() => {
    const sync = () => setSaved(readVenueShortlist());
    sync();
    window.addEventListener("venue-shortlist", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("venue-shortlist", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if (!active || invalidDate) return;
    // SSR supplies the unfiltered catalogue. Date availability always uses the API.
    const controller = new AbortController();
    setBusy(true);
    setFailure({ date, message: "" });
    fetch(`/api/venues${date ? `?date=${encodeURIComponent(date)}` : ""}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.venues)) {
          throw Error(
            "We could not load venues or check dates. Please try again.",
          );
        }
        if (controller.signal.aborted) return;
        const venues = (data.venues as VenueListing[]).filter(
          (venue) => !venue.is_demo,
        );
        setLoaded({ date, venues });
        if (!date) {
          setCatalogue(venues);
          setCollectionKnown(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailure({
            date,
            message:
              "We could not load venues or check dates. Please try again.",
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [active, date, invalidDate, retry]);

  useEffect(() => {
    if (!active || !date || collectionKnown) return;
    const controller = new AbortController();
    fetch("/api/venues", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (
          response.ok &&
          Array.isArray(data.venues) &&
          !controller.signal.aborted
        ) {
          setCatalogue(data.venues.filter((v: VenueListing) => !v.is_demo));
          setCollectionKnown(true);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [active, date, collectionKnown]);
  const collectionEmpty =
    collectionKnown && catalogue.length === 0 && !loading && !error;
  const distances =
    result?.venues || (ignoreParentLocation ? undefined : matches);
  const counties = [
    ...new Set(
      [...catalogue, ...(loaded?.venues || [])]
        .filter((venue) => !venue.is_demo)
        .map((venue) => venue.county)
        .filter(Boolean),
    ),
  ].sort();
  if (filters.county && !counties.includes(filters.county))
    counties.push(filters.county);
  const visible = filterVenueListings(
    loaded?.venues.filter((venue) => !venue.is_demo) || [],
    {
      query: filters.q.trim(),
      county: filters.county,
      guests: Number(filters.guests),
      setting: filters.setting,
      type: filters.type,
      maxHirePence:
        Number(filters.budget) > 0
          ? Math.round(Number(filters.budget) * 100)
          : 0,
      features: filters.features,
    },
  ).filter(
    (venue) =>
      (!shortlistOnly || saved.includes(venue.id)) &&
      (!distances?.[venue.slug] ||
        !radius ||
        distances[venue.slug].miles <= radius),
  );
  visible.sort((a, b) => {
    let difference = 0;
    if (filters.sort === "price")
      difference =
        (a.details?.hire_from_pence ?? Infinity) -
        (b.details?.hire_from_pence ?? Infinity);
    if (filters.sort === "capacity")
      difference = (b.capacity_max || 0) - (a.capacity_max || 0);
    if (filters.sort === "distance")
      difference =
        (distances?.[a.slug]?.miles ?? Infinity) -
        (distances?.[b.slug]?.miles ?? Infinity);
    return (
      (Number.isNaN(difference) ? 0 : difference) ||
      a.name.localeCompare(b.name)
    );
  });
  function update<K extends keyof VenueSearchFilters>(
    key: K,
    value: VenueSearchFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  function writeUrl(values: VenueSearchFilters) {
    if (!syncUrl) return;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (key === "features")
        (value as string[]).forEach((feature) =>
          params.append("feature", feature),
        );
      else if (value) params.set(key, String(value));
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`,
    );
  }
  return (
    <>
      <div hidden={collectionEmpty}>
        <form
          className="my-8 rounded-2xl border border-sand bg-white p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            writeUrl(filters);
            setRetry((value) => value + 1);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              Venue name or location
              <input
                name="q"
                value={filters.q}
                onChange={(e) => update("q", e.target.value)}
                placeholder="Town, county or venue"
                maxLength={150}
                className={field}
              />
            </label>
            <label className="text-sm">
              County
              <select
                name="county"
                value={filters.county}
                onChange={(e) => update("county", e.target.value)}
                className={field}
              >
                <option value="">All counties</option>
                {counties.map((county) => (
                  <option key={county}>{county}</option>
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
                step="1"
                value={filters.guests}
                onChange={(e) => update("guests", e.target.value)}
                className={field}
              />
            </label>
            <label className="text-sm">
              Wedding date
              <input
                name="date"
                type="date"
                value={invalidDate ? "" : date}
                aria-invalid={invalidDate}
                aria-describedby={
                  syncUrl ? "public-venue-date-help" : "studio-venue-date-help"
                }
                onChange={(e) => update("date", e.target.value)}
                className={field}
              />
            </label>
          </div>
          <details
            className="mt-5 border-t border-sand pt-4"
            open={
              !!(
                filters.type ||
                filters.setting ||
                filters.budget ||
                filters.features.length ||
                filters.sort
              )
            }
          >
            <summary className="cursor-pointer text-sm">
              More filters: type, hire budget, facilities & sort
            </summary>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                Venue type
                <select
                  name="type"
                  value={filters.type}
                  onChange={(e) => update("type", e.target.value)}
                  className={field}
                >
                  <option value="">Any venue type</option>
                  {Object.entries(VENUE_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Setting
                <select
                  name="setting"
                  value={filters.setting}
                  onChange={(e) => update("setting", e.target.value)}
                  className={field}
                >
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
                  min="0"
                  max="1000000"
                  step="0.01"
                  value={filters.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  className={field}
                />
              </label>
              <label className="text-sm">
                Sort by
                <select
                  name="sort"
                  value={filters.sort}
                  onChange={(e) => update("sort", e.target.value)}
                  className={field}
                >
                  <option value="">Venue name</option>
                  <option value="price">Starting hire price</option>
                  <option value="capacity">Largest guest capacity</option>
                  <option value="distance">Nearest location</option>
                </select>
              </label>
            </div>
            <fieldset className="mt-5 border-t border-sand pt-5">
              <legend className="text-sm">Facilities that matter to you</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(VENUE_FEATURES).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="feature"
                      value={key}
                      checked={filters.features.includes(key)}
                      onChange={(e) =>
                        update(
                          "features",
                          e.target.checked
                            ? [...filters.features, key]
                            : filters.features.filter(
                                (feature) => feature !== key,
                              ),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="mt-4 text-xs leading-relaxed text-ink/60">
              Starting hire prices exclude styling unless stated. Budget
              searches require a published starting price. Confirm inclusions
              and access with the venue.
            </p>
          </details>
          <p
            id={syncUrl ? "public-venue-date-help" : "studio-venue-date-help"}
            className="mt-3 text-xs text-ink/60"
          >
            Date searches exclude known booked and blocked dates. Every date
            still needs venue confirmation.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <button className="rounded-full bg-ink px-6 py-3 text-sm text-cream">
              Find venues
            </button>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                setFilters({ ...emptyFilters });
                setShortlistOnly(false);
                setResult(null);
                setLocationPostcode("");
                setIgnoreParentLocation(true);
                setRadius(50);
                setLocationRevision((value) => value + 1);
                writeUrl(emptyFilters);
              }}
            >
              Clear filters
            </button>
            {invalidDate && (
              <button
                type="button"
                className="text-sm underline"
                onClick={() => update("date", "")}
              >
                Clear invalid date
              </button>
            )}
          </div>
        </form>
        <LocationFilter
          key={locationRevision}
          postcode={locationPostcode}
          result={result}
          onResult={setResult}
          radius={radius}
          onRadius={setRadius}
        />
        {matches && !result && !ignoreParentLocation && (
          <button
            type="button"
            onClick={() => setIgnoreParentLocation(true)}
            className="mb-5 text-sm underline"
          >
            Clear wedding location filter
          </button>
        )}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-sm">
          <p role="status">
            {collectionEmpty
              ? "No published venues yet"
              : invalidDate
                ? "Choose a valid wedding date."
                : loading
                  ? "Finding venues…"
                  : error
                    ? "Venue search unavailable"
                    : `${visible.length} ${visible.length === 1 ? "venue matches" : "venues match"} your search`}
          </p>
          <label className="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              checked={shortlistOnly}
              onChange={(e) => setShortlistOnly(e.target.checked)}
            />
            My shortlist{" "}
            <span className="text-xs text-ink/50">(saved on this device)</span>
          </label>
        </div>
      </div>
      {invalidDate && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-clay p-5 text-sm"
        >
          Choose a valid wedding date or clear the date to browse all venues.
        </p>
      )}
      {!invalidDate && error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-clay p-5 text-sm"
        >
          {error}
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="ml-3 underline"
          >
            Try again
          </button>
        </div>
      )}
      {!invalidDate &&
        !loading &&
        !error &&
        (visible.length ? (
          <VenueCards
            venues={visible}
            distances={distances}
            selectedSlug={selectedSlug}
            onSelect={onSelect}
            requestDate={date || undefined}
            guestCount={Number(filters.guests) || undefined}
          />
        ) : (
          <div role="status" className="rounded-xl bg-cream p-6">
            <h2 className="font-serif text-2xl">
              {collectionEmpty
                ? "Venue listings are coming soon"
                : "No venues match these plans yet"}
            </h2>
            <p className="mt-3 text-sm text-ink/60">
              {collectionEmpty
                ? "We are onboarding venue partners. Explore the clearly marked demos below, or keep planning with your own venue. Demo venues cannot be booked."
                : "Try a nearby county, another date, a wider distance or fewer filters. You can also keep planning with your own venue."}
            </p>
          </div>
        ))}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-cream p-5">
        <div>
          <h2 className="font-serif text-2xl">Already have your venue?</h2>
          <p className="mt-2 text-sm text-ink/60">
            Save your booked venue and photos privately in your wedding plan.
            This does not create a public listing.
          </p>
        </div>
        {onVisualise ? (
          <button
            type="button"
            onClick={onVisualise}
            className="rounded-full border border-sand px-4 py-2 text-sm"
          >
            Save my booked venue
          </button>
        ) : (
          <Link
            href="/design?tab=wedding"
            className="rounded-full border border-sand px-4 py-2 text-sm"
          >
            Save my booked venue
          </Link>
        )}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-ink/60">
        Saving a venue is a planned choice for your wedding, not a confirmed
        booking. It does not reserve a date. Agree bookings, contracts and
        payment separately with the venue.
      </p>
      <DemoVenues />
    </>
  );
}
