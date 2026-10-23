"use client";
import { useState } from "react";
import type { VenueListing } from "@/lib/venues";
import type { DiscoveryResults } from "@/lib/location";
import LocationFilter from "@/components/wedding/LocationFilter";
import { VenueCards } from "./VenueCollection";
export default function NearbyVenues({ venues }: { venues: VenueListing[] }) {
  const [result, setResult] = useState<DiscoveryResults | null>(null),
    [radius, setRadius] = useState(50);
  const visible = venues
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
      <LocationFilter
        result={result}
        onResult={setResult}
        radius={radius}
        onRadius={setRadius}
      />
      {visible.length ? (
        <VenueCards venues={visible} distances={result?.venues} />
      ) : (
        <p role="status" className="py-8 text-ink/60">
          No venues match this distance. Try a wider search.
        </p>
      )}
    </>
  );
}
