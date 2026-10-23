import Link from "next/link";
import type { VenueListing } from "@/lib/venues";
import { safeImageUrl } from "@/lib/venue-input";
import { formatGBP } from "@/lib/quote";

// Shared by public venue discovery and the studio. Only published, public
// listing fields reach these cards; enquiries stay on the separate detail flow.
import type { DiscoveryMatch } from "@/lib/location";
export function VenueCards({
  distances,
  venues,
  selectedSlug,
  onSelect,
}: {
  distances?: Record<string, DiscoveryMatch>;
  venues: VenueListing[];
  selectedSlug?: string;
  onSelect?: (venue: VenueListing) => void;
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {venues.map((venue) => {
        const image = safeImageUrl(venue.hero_image),
          selected = selectedSlug === venue.slug;
        return (
          <article
            key={venue.id}
            className="flex min-w-0 flex-col border-b border-sand pb-6"
          >
            <Link href={`/venues/${venue.slug}`} className="group">
              {image ? (
                <img
                  src={image}
                  alt={venue.name}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-sand px-5 text-center font-serif text-3xl text-ink/50">
                  {venue.name}
                </div>
              )}
              <h2 className="mt-4 font-serif text-3xl group-hover:text-clay">
                {venue.name}
              </h2>
            </Link>
            <p className="mt-2 text-sm text-ink/60">
              {venue.location}
              {venue.capacity_max
                ? ` · Up to ${venue.capacity_max} guests`
                : ""}
            </p>
            {distances && (
              <p className="mt-2 text-xs text-ink/60">
                {distances[venue.slug]
                  ? `${distances[venue.slug].miles} miles from your chosen location`
                  : "Location needs confirming"}
              </p>
            )}
            {venue.package_from_pence !== null && (
              <p className="mt-3 text-sm">
                Styling from {formatGBP(venue.package_from_pence / 100)}
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-4 pt-5">
              <Link
                href={`/venues/${venue.slug}`}
                className="text-sm underline"
              >
                Details & dates
              </Link>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(venue)}
                  className={`rounded-full px-4 py-2 text-sm ${selected ? "border border-clay bg-blush" : "bg-ink text-cream"}`}
                >
                  {selected ? "Continue with this venue" : "Choose this venue"}
                </button>
              ) : (
                <Link
                  href={`/design?venue=${encodeURIComponent(venue.slug)}&tab=catalogue`}
                  className="rounded-full bg-ink px-4 py-2 text-sm text-cream"
                >
                  Style this venue
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function VenueOperatorCallout() {
  return (
    <section className="mt-12 grid gap-5 border-t border-sand pt-8 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <p className="text-xs uppercase tracking-widest text-clay">
          For venue teams
        </p>
        <h2 className="mt-2 font-serif text-3xl">Bring your venue to Styled</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/60">
          Share your space, photography and styling possibilities. Our team will
          work with you on an approved listing, packages and date enquiries.
        </p>
      </div>
      <Link
        href="/venues/partner"
        className="self-start rounded-full border border-ink px-5 py-3 text-center text-sm"
      >
        Partner with us
      </Link>
    </section>
  );
}
