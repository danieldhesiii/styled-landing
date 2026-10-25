"use client";

import Link from "next/link";
import type { VenueListing } from "@/lib/venues";
import type { DiscoveryMatch } from "@/lib/location";
import VenueSearch from "./VenueSearch";

export default function VenueExplorer(props: {
  matches?: Record<string, DiscoveryMatch>;
  searchRadius?: number;
  active: boolean;
  guestCount: number;
  weddingDate?: string;
  postcode?: string;
  selectedSlug?: string;
  onSelect: (venue: VenueListing) => void;
  onVisualise: () => void;
  onRequests?: () => void;
}) {
  return (
    <section
      aria-label="Venue discovery"
      className="rounded-2xl border border-sand bg-white p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl">Find a venue</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
            Find a space for your event. Save a favourite or ask about dates.
          </p>
        </div>
        {props.onRequests ? (
          <button
            type="button"
            onClick={props.onRequests}
            className="text-sm underline"
          >
            Venue requests
          </button>
        ) : (
          <Link
            href="/design?tab=orders&bookings=venues"
            className="text-sm underline"
          >
            Venue requests
          </Link>
        )}
      </div>
      <VenueSearch {...props} />
    </section>
  );
}
