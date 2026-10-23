"use client";
import { readVenueShortlist } from "./VenueShortlist";
import { useState, useEffect } from "react";
import type { VenueListing } from "@/lib/venues";
import type { DiscoveryResults } from "@/lib/location";
import LocationFilter from "@/components/wedding/LocationFilter";
import { VenueCards } from "./VenueCollection";
export default function NearbyVenues({
  venues,
  requestDate,
  guestCount,
}: {
  venues: VenueListing[];
  requestDate?: string;
  guestCount?: number;
}) {
  const [result, setResult] = useState<DiscoveryResults | null>(null),
    [radius, setRadius] = useState(50);
  const [saved, setSaved] = useState<string[]>([]),
    [shortlistOnly, setShortlistOnly] = useState(false);
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
  const visible = venues
    .filter((v) => !shortlistOnly || saved.includes(v.id))
    .filter(
      (v) =>
        !result?.venues[v.slug] ||
        !radius ||
        result.venues[v.slug].miles <= radius,
    )
    .sort(
      (a, b) =>
        (result?.venues[a.slug]?.miles ?? Infinity) -
        (result?.venues[b.slug]?.miles ?? Infinity),
    );
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-sm">
        <p>
          {visible.length} {visible.length === 1 ? "venue" : "venues"} match
          your search
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shortlistOnly}
            onChange={(e) => setShortlistOnly(e.target.checked)}
          />
          My shortlist
          <span className="text-xs text-ink/50">(saved on this device)</span>
        </label>
      </div>
      <LocationFilter
        result={result}
        onResult={setResult}
        radius={radius}
        onRadius={setRadius}
      />
      {visible.length ? (
        <VenueCards
          requestDate={requestDate}
          guestCount={guestCount}
          venues={visible}
          distances={result?.venues}
        />
      ) : (
        <p role="status" className="py-8 text-ink/60">
          No venues match your distance or shortlist filters. Try a wider search
          or switch off My shortlist.
        </p>
      )}
    </>
  );
}
