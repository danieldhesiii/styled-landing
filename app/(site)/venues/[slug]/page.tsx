import Link from "next/link";
import DemoVenueBooking from "@/components/venues/DemoVenueBooking";
import VenueSupplierJourney from "@/components/venues/VenueSupplierJourney";
import {VENUE_MODES, venuePolicy} from "@/lib/venue-suppliers";
import VenueMediaPlaceholder from "@/components/venues/VenueMediaPlaceholder";
import { notFound } from "next/navigation";
import { loadPublicVenue } from "@/lib/server/venues";
import { createClient } from "@/lib/supabase/server";
import { safeImageUrl, venueEmbed } from "@/lib/venue-input";
import {
  VENUE_TYPES,
  VENUE_FEATURES,
  validVenueDay,
} from "@/lib/venue-details";
import { formatGBP } from "@/lib/quote";
import VenueTour from "@/components/venues/VenueTour";
import VenueGallery from "@/components/venues/VenueGallery";
import VenueShortlist from "@/components/venues/VenueShortlist";
import VenueEnquiryForm from "@/components/venues/VenueEnquiryForm";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadPublicVenue(slug);
  return {
    title: result
      ? `${result.venue.name} · Wedding venue · Styled`
      : "Venue · Styled",
    description: result?.venue.description?.slice(0, 160),
    ...(result?.venue.is_demo
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}
export default async function VenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const initialKind = query.request === "viewing" ? "viewing" : "booking";
  const initialDate = validVenueDay(query.date) ? query.date : "";
  const count = Number(query.guests);
  const initialGuests =
    Number.isInteger(count) && count > 0 && count <= 10000 ? count : undefined;
  const result = await loadPublicVenue(slug);
  if (!result) notFound();
  const { venue, packages } = result;
  const hero = safeImageUrl(venue.hero_image),
    video = venueEmbed(venue.video_url, "video"),
    tour = venueEmbed(venue.matterport_url, "tour"),
    map = venueEmbed(venue.map_embed_url, "map");
  const d = venue.details;
  const { data: session } = await (await createClient()).auth.getUser();
  const email =
    session.user && !session.user.is_anonymous ? session.user.email : undefined;
  const hire =
    d?.hire_from_pence != null
      ? `From ${formatGBP(d.hire_from_pence / 100)}`
      : "Price on request";
  return (
    <article className="py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/venues" className="text-sm text-clay">
          ← All venues
        </Link>
        <Link
          href="/design?tab=orders&bookings=venues"
          className="text-sm underline"
        >
          My bookings
        </Link>
      </div>
      {venue.is_demo && (
        <div
          role="note"
          className="mt-6 rounded-xl border border-clay/30 bg-blush/30 p-5 text-sm leading-relaxed"
        >
          <strong>Demo venue · Practice only.</strong> Try a booking request and
          the venue team’s response below. No real booking, email or payment is
          created. Prices and images are examples; video and 3D tour spaces are
          intentionally blank.
          <div className="mt-3 flex flex-wrap gap-5">
            <a className="underline" href="#enquire">Try a booking request ↓</a>
            <a className="underline" href="#walkthrough">
              See 3D walkthrough space ↓
            </a>
            <a className="underline" href="#video">
              See video space ↓
            </a>
          </div>
        </div>
      )}
      <p className="mt-7 text-sm uppercase tracking-widest text-clay">
        {d?.venue_type
          ? VENUE_TYPES[d.venue_type as keyof typeof VENUE_TYPES]
          : "Wedding venue"}{" "}
        · {venue.county}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="font-serif text-4xl sm:text-6xl">{venue.name}</h1>
          <p className="mt-4 text-ink/60">
            {venue.location}
            {venue.capacity_max
              ? ` · Up to ${venue.capacity_max} seated guests`
              : ""}
          </p>
        </div>
        {!venue.is_demo && <VenueShortlist id={venue.id} />}
      </div>
      {hero && (
        <img
          src={hero}
          alt={`${venue.name} wedding venue`}
          className="mt-8 aspect-[4/3] w-full rounded-2xl object-cover sm:aspect-[16/8]"
        />
      )}
      <nav
        aria-label="Venue page sections"
        className="mt-6 flex gap-6 overflow-x-auto border-b border-sand pb-4 text-sm"
      >
        {[
          ["overview", "Overview"],
          ["gallery", "Photos"],
          ["walkthrough", "3D walkthrough"],
          ["video", "Video"],
          [!venue.is_demo && venuePolicy(venue.details).mode==="styled"?"packages":"suppliers", venue.is_demo?"Supplier arrangement":venuePolicy(venue.details).mode==="styled"?"Styling":"Suppliers & booking"],
          ["enquire", venue.is_demo ? "Try booking" : "Requests"],
        ].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="shrink-0 py-2 hover:text-clay">
            {l}
          </a>
        ))}
      </nav>
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section id="overview" className="scroll-mt-24">
            <h2 className="font-serif text-3xl">A place for your plans</h2>
            <p className="mt-5 whitespace-pre-line leading-relaxed text-ink/70">
              {venue.description ||
                "Ask the venue team for more information about hosting your wedding here."}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-5 border-y border-sand py-5">
              {[
                [
                  "Seated wedding guests",
                  venue.capacity_max
                    ? `${venue.capacity_min ? `${venue.capacity_min} to ` : ""}${venue.capacity_max}`
                    : null,
                ],
                ["Ceremony guests", d?.ceremony_capacity],
                ["Evening guests", d?.evening_capacity],
                ["On-site bedrooms", d?.bedrooms],
                [
                  "Setting",
                  venue.indoor_outdoor === "both"
                    ? "Indoor & outdoor"
                    : venue.indoor_outdoor,
                ],
              ]
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-sm text-ink/60">{k}</dt>
                    <dd className="mt-2 text-sm capitalize">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>
          {!!d?.features?.length && (
            <section className="mt-8">
              <h2 className="font-serif text-3xl">What you’ll find here</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {d.features
                  .filter((f) =>
                    Object.prototype.hasOwnProperty.call(VENUE_FEATURES, f),
                  )
                  .map((f) => (
                    <li key={f} className="flex gap-3 text-sm">
                      <span className="text-clay" aria-hidden="true">
                        ✓
                      </span>
                      {VENUE_FEATURES[f as keyof typeof VENUE_FEATURES]}
                    </li>
                  ))}
              </ul>
            </section>
          )}
          <section className="mt-10">
            <h2 className="font-serif text-3xl">Venue hire & inclusions</h2>
            <p className="mt-4 text-xl">
              {venue.is_demo ? `Example hire ${hire.toLowerCase()}` : hire}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/70">
              {d?.pricing_notes ||
                "Ask for a tailored quote for your date, guest count and hire requirements. Styling, catering and accommodation may be priced separately."}
            </p>
          </section>
          {(
            [
              ["Catering & suppliers", d?.catering_notes],
              ["Access & practical details", d?.access_notes],
            ] as const
          )
            .filter(([, v]) => v)
            .map(([h, p]) => (
              <section key={h} className="mt-8">
                <h2 className="font-serif text-2xl">{h}</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/70">
                  {p}
                </p>
              </section>
            ))}
        </div>
        <aside className="rounded-2xl border border-sand bg-white p-6 lg:sticky lg:top-24">
          <p className="text-sm uppercase tracking-widest text-clay">
            Your day at {venue.name}
          </p>
          <p className="mt-4 font-serif text-3xl">
            {venue.is_demo ? `Example hire ${hire.toLowerCase()}` : hire}
          </p>
          <p className="mt-1 text-sm text-ink/60">
            {venue.is_demo
              ? "Fictional venue · Illustrative pricing only"
              : "Venue hire, subject to inclusions and your date"}
          </p>
          {!venue.is_demo && (
            <>
              <a
                href="#enquire"
                className="mt-6 block rounded-full bg-ink px-5 py-3 text-center text-sm text-cream"
              >
                Request a booking or viewing
              </a>
              <p className="mt-4 text-sm leading-relaxed text-ink/60">
                Date subject to venue confirmation. No payment is taken.
              </p>
              <Link
                href={`/design?venue=${encodeURIComponent(venue.slug)}&tab=wedding`}
                className="mt-5 block text-sm underline"
              >
                Save this venue to your wedding plan →
              </Link>
              {venuePolicy(venue.details).mode!=="venue_only" && <Link
                href={`/design?venue=${encodeURIComponent(venue.slug)}&tab=catalogue`}
                className="mt-5 block text-sm underline"
              >
                Browse styling for this venue →
              </Link>}
            </>
          )}
          {venue.is_demo && (
            <div className="mt-5 space-y-4 text-sm">
              <a href="#enquire" className="block rounded-full bg-ink px-5 py-3 text-center text-cream">Try a booking request</a>
              <p className="text-ink/60">Practice only. Nothing is sent or reserved.</p>
              <a href="#walkthrough" className="block underline">
                3D walkthrough space ↓
              </a>
              <a href="#video" className="block underline">
                Venue video space ↓
              </a>
            </div>
          )}
        </aside>
      </div>
      <section id="gallery" className="mt-12 scroll-mt-24">
        <h2 className="mb-5 font-serif text-3xl">Venue photographs</h2>
        {venue.gallery_images.length ? (
          <VenueGallery
            name={venue.name}
            images={venue.gallery_images
              .map(safeImageUrl)
              .filter((u): u is string => !!u)}
          />
        ) : (
          <p className="text-sm text-ink/60">
            More venue photographs have not been added yet.
          </p>
        )}
      </section>
      <VenueTour
        name={venue.name}
        demo={venue.is_demo}
        url={tour}
        viewingHref={`/venues/${venue.slug}?request=viewing${initialGuests ? `&guests=${initialGuests}` : ""}#enquire`}
      />
      <section id="video" className="mt-10 scroll-mt-24">
        <p className="text-sm uppercase tracking-widest text-clay">
          See the atmosphere
        </p>
        <h2 className="mt-2 font-serif text-3xl">Venue video</h2>
        <p className="mt-3 text-sm text-ink/60">
          A venue film gives you a feel for the space, setting and celebrations.
        </p>
        {video ? (
          <iframe
            title={`${venue.name} video tour`}
            src={video}
            className="mt-6 aspect-video w-full rounded-xl"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        ) : (
          <VenueMediaPlaceholder kind="video" />
        )}
      </section>
      {!venue.is_demo&&<VenueSupplierJourney name={venue.name} slug={venue.slug} policy={venuePolicy(venue.details)}/>}
      {!venue.is_demo && venuePolicy(venue.details).mode==="styled" && <section id="packages" className="mt-12 scroll-mt-24">
        <h2 className="font-serif text-3xl">Make the space your own</h2>
        <p className="mt-3 text-sm text-ink/60">
          Styling packages are separate from venue hire unless explicitly
          included.
        </p>
        {packages.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {packages.map((p) => (
              <div key={p.id} className="rounded-xl border border-sand p-6">
                <h3 className="font-serif text-2xl">{p.name}</h3>
                <p className="mt-2 text-clay">
                  Styling from {formatGBP(p.price_from_pence / 100)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  {p.description}
                </p>
                <Link
                  href={`/design?venue=${encodeURIComponent(venue.slug)}&style=${encodeURIComponent(p.style_id)}&tab=catalogue`}
                  className="mt-5 inline-block text-sm underline"
                >
                  Explore this style →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <Link
            href={
              venue.is_demo
                ? "/design?tab=catalogue"
                : `/design?venue=${encodeURIComponent(venue.slug)}&tab=catalogue`
            }
            className="mt-5 inline-block text-sm underline"
          >
            Explore supplier pieces in the catalogue →
          </Link>
        )}
      </section>
      }
      {venue.is_demo && <section id="suppliers" className="mt-12 scroll-mt-24 border-t border-sand pt-8"><h2 className="font-serif text-3xl">{VENUE_MODES[venuePolicy(venue.details).mode]}</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">{venuePolicy(venue.details).mode==="venue_only"?"This venue keeps couples with its own local recommended suppliers. No Styled catalogue recommendations are offered.":venuePolicy(venue.details).mode==="venue_partners"?"This venue uses a selected range from its approved suppliers on Styled. The demo shows the route without linking real supplier accounts.":"This venue welcomes the wider Styled catalogue. Venue hire and product requests are separate."} Try the booking below to see the next step.</p></section>}
      <section
        id="enquire"
        className="mt-14 scroll-mt-24 border-t border-sand pt-10"
      >
        {venue.is_demo ? (
          <DemoVenueBooking venue={venue} />
        ) : (
          <>
            <h2 className="font-serif text-4xl">Let’s talk about your plans</h2>
            <p className="mb-8 mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
              Ask about dates or a viewing. Read replies in My bookings.
            </p>
            <VenueEnquiryForm
              slug={venue.slug}
              venueId={venue.id}
              packages={venuePolicy(venue.details).mode==="styled"?packages:[]}
              accountEmail={email}
              initialKind={initialKind}
              initialDate={initialKind === "booking" ? initialDate : ""}
              initialGuests={initialGuests}
            />
          </>
        )}
      </section>
      {!venue.is_demo && (
        <section className="mt-12 border-t border-sand pt-8">
          <h2 className="font-serif text-3xl">Find your way here</h2>
          <p className="mt-4 text-sm">
            {[d?.address || venue.location, d?.postcode, venue.county]
              .filter(Boolean)
              .join(", ")}
          </p>
          {map ? (
            <iframe
              title={`${venue.name} location`}
              src={map}
              loading="lazy"
              className="mt-5 h-80 w-full rounded-xl"
              referrerPolicy="no-referrer"
            />
          ) : (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.name, d?.address || venue.location, d?.postcode, venue.county].filter(Boolean).join(" "))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm underline"
            >
              Open location in Google Maps ↗
            </a>
          )}
        </section>
      )}
    </article>
  );
}
