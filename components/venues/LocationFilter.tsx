"use client";
import { useEffect, useRef, useState } from "react";
import { validPostcode, type DiscoveryResults } from "@/lib/location";
export default function LocationFilter({
  postcode = "",
  venueSlug,
  result,
  onResult,
  radius,
  onRadius,
  entity = "venues",
}: {
  postcode?: string;
  venueSlug?: string;
  result: DiscoveryResults | null;
  onResult: (r: DiscoveryResults | null) => void;
  radius: number;
  onRadius: (v: number) => void;
  entity?: "venues" | "suppliers";
}) {
  const [query, setQuery] = useState(postcode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0);
  async function search(
    value:
      | { query: string }
      | { postcode: string }
      | { venueSlug: string }
      | { point: { latitude: number; longitude: number } },
  ) {
    const revision = ++request.current;
    setBusy(true);
    setError("");
    onResult(null);
    try {
      const r = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const d = await r.json();
      if (!r.ok || !d.ok)
        throw Error(d.error || "Could not match this location.");
      if (revision === request.current) onResult(d);
    } catch (e) {
      if (revision === request.current)
        setError(
          e instanceof Error ? e.message : "Could not match this location.",
        );
    } finally {
      if (revision === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    ++request.current;
    setQuery(postcode);
    if (venueSlug) {
      const t = setTimeout(() => void search({ venueSlug }), 300);
      return () => { clearTimeout(t); ++request.current; };
    }
    if (!validPostcode(postcode)) {
      ++request.current;
      onResult(null);
      setBusy(false);
      return;
    }
    const t = setTimeout(() => void search({ postcode }), 700);
    return () => { clearTimeout(t); ++request.current; };
  }, [postcode, venueSlug]);
  useEffect(() => () => { ++request.current; }, []);
  function locate() {
    if (!navigator.geolocation) {
      setError("Location access is unavailable. Enter a postcode instead.");
      return;
    }
    setBusy(true);
    setError("");
    const revision = ++request.current;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (revision !== request.current) return;
        void search({
          point: { latitude: p.coords.latitude, longitude: p.coords.longitude },
        });
      },
      () => {
        if (revision !== request.current) return;
        setBusy(false);
        setError("Location could not be accessed. Enter a postcode instead.");
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
    );
  }
  return (
    <details className="mb-5 rounded-xl border border-sand bg-white px-4 py-3">
      <summary className="cursor-pointer text-sm">
        <span className="font-medium">Location & delivery area</span>
        <span className="ml-2 text-sm text-ink/70">
          {result?.label || postcode || "Add a place or postcode"} ·{" "}
          {result?.placeMatches ? "Place name match" : radius ? `${radius} miles` : "Any distance"}
        </span>
      </summary>
      <section aria-label="Location matching" className="pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <form
            className="grid w-full min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto lg:flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              void search({ query });
            }}
          >
            <label className="min-w-0 text-sm">
              Place or postcode
              <input
                maxLength={160}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Town, county or full UK postcode"
                className="mt-2 block w-full rounded-xl border border-sand px-3 py-2 text-sm"
              />
            </label>
            <button
              disabled={busy}
              className="shrink-0 whitespace-nowrap min-h-11 rounded-full bg-ink px-4 py-2 text-sm text-cream disabled:opacity-50"
            >
              {busy ? "Finding matches…" : "Apply location"}
            </button>
          </form>
          <button
            type="button"
            disabled={busy}
            onClick={locate}
            className="min-h-11 rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50"
          >
            Use my location
          </button>
          <label className="text-sm">
            Search distance
            <select
              disabled={!!result?.placeMatches}
              value={radius}
              onChange={(e) => onRadius(Number(e.target.value))}
              className="mt-2 block rounded-xl border border-sand px-3 py-2 text-sm"
            >
              {[25, 50, 100, 250, 0].map((n) => (
                <option value={n} key={n}>
                  {n ? `${n} miles` : "Any distance"}
                </option>
              ))}
            </select>
          </label>
          {result && (
            <button
              type="button"
              onClick={() => {
                ++request.current;
                onResult(null);
                setBusy(false);
                setError("");
              }}
              className="py-2 text-sm underline"
            >
              Clear location
            </button>
          )}
        </div>
        <p role="status" className="mt-3 text-sm leading-relaxed text-ink/60">
          {error ||
            (result
              ? result.placeMatches
                ? Object.keys(result.placeMatches[entity]).length
                  ? `Showing published locations matching ${result.label}. Place names do not establish distance or delivery coverage.`
                  : `No published ${entity === "venues" ? "venue" : "supplier"} locations match ${result.label}. Try another place or a full postcode.`
                : `Showing matches around ${result.label}. Distances are approximate. Listings without confirmed locations stay visible and are labelled.`
              : "Search published place names, or use a full postcode for approximate distances. Location access is optional.")}
        </p>
      </section>
    </details>
  );
}
