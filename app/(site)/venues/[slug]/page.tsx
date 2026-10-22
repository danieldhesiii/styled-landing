import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicVenue } from "@/lib/server/venues";
import { safeImageUrl, venueEmbed } from "@/lib/venue-input";
import { formatGBP } from "@/lib/quote";
import VenueTour from "@/components/venues/VenueTour";
import VenueGallery from "@/components/venues/VenueGallery";
import VenueEnquiryForm from "@/components/venues/VenueEnquiryForm";
export const dynamic = "force-dynamic";
export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadPublicVenue(slug);
  if (!result) notFound();
  const { venue, packages } = result;
  const hero = safeImageUrl(venue.hero_image),
    video = venueEmbed(venue.video_url, "video"),
    tour = venueEmbed(venue.matterport_url, "tour"),
    map = venueEmbed(venue.map_embed_url, "map");
  return (
    <article className="py-10 sm:py-16">
      <Link href="/venues" className="text-sm text-clay">
        ← All venues
      </Link>
      <h1 className="mt-6 font-serif text-5xl sm:text-6xl">{venue.name}</h1>
      <p className="mt-3 text-ink/60">
        {venue.location}
        {venue.capacity_max ? ` · Up to ${venue.capacity_max} guests` : ""}
      </p>
      {hero && (
        <img
          src={hero}
          alt={venue.name}
          className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
        />
      )}
      {!!venue.gallery_images.length && (
        <section className="mt-8" aria-label="Venue gallery">
          <VenueGallery
            name={venue.name}
            images={venue.gallery_images
              .map(safeImageUrl)
              .filter((url): url is string => !!url)}
          />
        </section>
      )}
      {venue.description && (
        <section className="mt-14 max-w-3xl">
          <h2 className="font-serif text-3xl">About the venue</h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-ink/70">
            {venue.description}
          </p>
        </section>
      )}
      {video && (
        <section className="mt-14">
          <h2 className="mb-5 font-serif text-3xl">Take a look around</h2>
          <iframe
            title={`${venue.name} video tour`}
            src={video}
            className="aspect-video w-full rounded-xl"
            loading="lazy"
            allowFullScreen
          />
        </section>
      )}
      {tour && <VenueTour name={venue.name} url={tour} />}
      {!!packages.length && (
        <section className="mt-14">
          <h2 className="font-serif text-3xl">Styling packages</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {packages.map((p) => (
              <div key={p.id} className="rounded-xl border border-sand p-6">
                <h3 className="font-serif text-2xl">{p.name}</h3>
                <p className="mt-2 text-clay">
                  From {formatGBP(p.price_from_pence / 100)}
                </p>
                <p className="mt-3 text-sm text-ink/60">{p.description}</p>
                <Link
                  href={`/design?venue=${encodeURIComponent(venue.slug)}&style=${encodeURIComponent(p.style_id)}&render=true`}
                  className="mt-5 inline-block underline"
                >
                  Explore this style in the studio
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
      <section
        id="enquire"
        className="mt-16 scroll-mt-24 border-t border-sand pt-10"
      >
        <h2 className="font-serif text-4xl">Tell us about your date</h2>
        <p className="mb-8 mt-3 text-ink/60">
          Share your plans and we’ll check availability with you.
        </p>
        <VenueEnquiryForm
          slug={venue.slug}
          venueId={venue.id}
          packages={packages}
        />
      </section>
      {map && (
        <iframe
          title={`${venue.name} location`}
          src={map}
          loading="lazy"
          className="mt-14 h-80 w-full rounded-xl"
          referrerPolicy="no-referrer"
        />
      )}
      <Link
        href={`/design?venue=${encodeURIComponent(venue.slug)}&render=true`}
        className="mt-12 inline-block rounded-full bg-ink px-6 py-3 text-cream"
      >
        Design your day at {venue.name}
      </Link>
    </article>
  );
}
