"use client";

import type { VenueListing } from "@/lib/venues";
import VenueSearch, { type VenueSearchFilters } from "./VenueSearch";

export default function NearbyVenues({
  venues,
  requestDate,
  guestCount,
  initialFilters,
  initialError,
}: {
  venues?: VenueListing[];
  requestDate?: string;
  guestCount?: number;
  initialFilters?: Partial<VenueSearchFilters>;
  initialError?: string;
}) {
  return (
    <VenueSearch
      initialVenues={venues}
      initialError={initialError}
      guestCount={guestCount}
      initialFilters={{ date: requestDate || "", ...initialFilters }}
      syncUrl
    />
  );
}
