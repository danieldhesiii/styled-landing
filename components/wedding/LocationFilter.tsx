"use client";
import { useEffect, useRef, useState } from "react";
import { validPostcode, type DiscoveryResults } from "@/lib/location";
export default function LocationFilter({
  postcode = "",
  result,
  onResult,
  radius,
  onRadius,
}: {
  postcode?: string;
  result: DiscoveryResults | null;
  onResult: (r: DiscoveryResults | null) => void;
  radius: number;
  onRadius: (v: number) => void;
}) {
  const [query, setQuery] = useState(postcode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0);
  async function search(
    value:
      | { postcode: string }
      | { point: { latitude: number; longitude: number } },
  ) {
    const revision = ++request.current;
    setBusy(true);
    setError("");
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
    if (!validPostcode(postcode)) {
      ++request.current;
      onResult(null);
      setBusy(false);
      return;
    }
    const t = setTimeout(() => void search({ postcode }), 700);
    return () => clearTimeout(t);
  }, [postcode]);
  function locate() {
    if (!navigator.geolocation) {
      setError("Location access is unavailable. Enter a postcode instead.");
      return;
    }
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (p) =>
        void search({
          point: { latitude: p.coords.latitude, longitude: p.coords.longitude },
        }),
      () => {
        setBusy(false);
        setError("Location could not be accessed. Enter a postcode instead.");
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
    );
  }
  return (
    <section
      aria-label="Location matching"
      className="mb-5 rounded-2xl border border-sand bg-white p-5"
    >
      <div className="flex flex-wrap items-end gap-3">
        <form
          className="flex min-w-0 flex-1 flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void search({ postcode: query });
          }}
        >
          <label className="min-w-0 flex-1 text-sm">
            Wedding location
            <input
              maxLength={10}
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Enter a UK postcode"
              className="mt-2 block w-full rounded-xl border border-sand px-3 py-2 text-sm"
            />
          </label>
          <button
            disabled={busy}
            className="rounded-full bg-ink px-4 py-2 text-sm text-cream disabled:opacity-50"
          >
            {busy ? "Finding matches…" : "Apply location"}
          </button>
        </form>
        <button
          type="button"
          disabled={busy}
          onClick={locate}
          className="rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50"
        >
          Use my location
        </button>
        <label className="text-xs">
          Search distance
          <select
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
              setError("");
            }}
            className="py-2 text-xs underline"
          >
            Clear location
          </button>
        )}
      </div>
      <p role="status" className="mt-3 text-xs leading-relaxed text-ink/60">
        {error ||
          (result
            ? `Showing matches around ${result.label}. Distances are approximate. Listings without confirmed location or delivery coverage stay visible and are labelled.`
            : "Use your venue postcode when you have one. Location access is optional; your current position is not saved to your account.")}
      </p>
    </section>
  );
}
