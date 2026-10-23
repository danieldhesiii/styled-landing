"use client";
import DemoVenues from "./DemoVenues";
import Link from "next/link";
import { useEffect, useState } from "react";
import { filterVenueListings, type VenueListing } from "@/lib/venues";
import { VenueCards, VenueOperatorCallout } from "./VenueCollection";
import type { DiscoveryMatch } from "@/lib/location";
export default function VenueExplorer({
  matches,
  searchRadius = 50,
  active,
  guestCount,
  selectedSlug,
  onSelect,
  onVisualise,
}: {
  matches?: Record<string, DiscoveryMatch>;
  searchRadius?: number;
  active: boolean;
  guestCount: number;
  selectedSlug?: string;
  onSelect: (venue: VenueListing) => void;
  onVisualise: () => void;
}) {
  const [venues, setVenues] = useState<VenueListing[] | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [county, setCounty] = useState(""),
    [setting, setSetting] = useState(""),
    [guests, setGuests] = useState(String(guestCount));
  useEffect(() => {
    setGuests(String(guestCount));
  }, [guestCount]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/venues", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !Array.isArray(d.venues))
          throw Error("We couldn’t load venues. Please try again.");
        setVenues(d.venues);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [active, retry]);
  const counties = [...new Set((venues || []).map((v) => v.county))].sort();
  const filtered = filterVenueListings(venues || [], {
    county,
    setting,
    guests: Number(guests),
  });
  const visible = filtered
    .filter(
      (v) =>
        !matches ||
        !matches[v.slug] ||
        !searchRadius ||
        matches[v.slug].miles <= searchRadius,
    )
    .sort(
      (a, b) =>
        (matches?.[a.slug]?.miles ?? Infinity) -
        (matches?.[b.slug]?.miles ?? Infinity),
    );
  const field =
    "mt-2 block w-full rounded-lg border border-sand bg-cream px-3 py-2 text-sm";
  return (
    <section
      aria-label="Venue discovery"
      className="rounded-2xl border border-sand bg-white p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            Your setting, your style
          </p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Venues</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
            Explore spaces, view styling packages and enquire about dates.
            Choose a venue to keep it with your design while you browse supplier
            pieces.
          </p>
        </div>
        <Link href="/venues" className="text-sm underline">
          Search venues, prices & dates →
        </Link>
      </div>
      <div className="my-7 grid gap-4 border-y border-sand py-5 sm:grid-cols-[1fr_1fr_120px_auto]">
        <label className="text-sm">
          County
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className={field}
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
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            className={field}
          >
            <option value="">Any setting</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
        </label>
        <label className="text-sm">
          Guests
          <input
            type="number"
            min="1"
            max="10000"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className={field}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setCounty("");
            setSetting("");
            setGuests("");
          }}
          className="self-end py-2 text-sm underline"
        >
          Clear filters
        </button>
      </div>
      {loading && (
        <p role="status" className="py-5 text-sm text-ink/60">
          Finding venues…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-clay p-5 text-sm"
        >
          {error}
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="ml-3 underline"
          >
            Try again
          </button>
        </div>
      )}
      {!loading &&
        !error &&
        venues &&
        (!visible.length ? (
          <div role="status" className="rounded-xl bg-cream p-6">
            <h2 className="font-serif text-2xl">
              {venues.length
                ? "No venues match your plans yet"
                : "Our venue collection is being prepared"}
            </h2>
            <p className="mt-3 text-sm text-ink/60">
              {venues.length
                ? "Try another county, setting or guest count."
                : "You can still browse supplier pieces and use a photo of your own venue in the visualiser."}
            </p>
          </div>
        ) : (
          <VenueCards
            distances={matches}
            venues={visible}
            selectedSlug={selectedSlug}
            onSelect={onSelect}
          />
        ))}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-cream p-5">
        <div>
          <h2 className="font-serif text-2xl">Already have your venue?</h2>
          <p className="mt-2 text-sm text-ink/60">
            Save your venue and its photographs in Wedding details, then use
            them in the visualiser. Your basket stays with you.
          </p>
        </div>
        <button
          type="button"
          onClick={onVisualise}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Add my own venue
        </button>
      </div>
      <p className="mt-5 text-xs leading-relaxed text-ink/50">
        Venue enquiries and confirmation are handled separately from your
        supplier basket. Choosing a venue here does not reserve a date.
      </p>
      <Link
        href="/venues/requests"
        className="mt-5 inline-block text-sm underline"
      >
        My venue booking & viewing requests →
      </Link>
      <DemoVenues />
      <VenueOperatorCallout />
    </section>
  );
}
