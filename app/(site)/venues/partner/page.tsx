import VenuePartnerForm from "@/components/venues/VenuePartnerForm";
import Link from "next/link";
export const metadata = { title: "List your wedding venue · Styled" };
export default function VenuePartnerPage() {
  return (
    <section className="py-12 sm:py-16">
      <Link href="/venues" className="text-sm text-clay">
        ← Explore venues
      </Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            For venue owners & teams
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-5xl sm:text-6xl">
            Make your space part of their story
          </h1>
          <p className="mt-6 max-w-xl leading-relaxed text-ink/70">
            Give couples a clear view of your venue, from its rooms and
            facilities to hire information and styling possibilities. Manage
            your listing and date requests in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/venue-portal"
              className="rounded-full bg-ink px-6 py-3 text-sm text-cream"
            >
              Create or manage your listing
            </Link>
            <a href="#speak-to-us" className="self-center text-sm underline">
              Talk to Styled first
            </a>
          </div>
        </div>
        <aside className="self-start rounded-2xl bg-white p-7">
          <h2 className="font-serif text-3xl">Have these to hand</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink/70">
            {[
              "Venue name, location and guest capacity",
              "A main photograph and room images",
              "Venue hire prices or how you quote",
              "Facilities, catering and access details",
              "A captured walkthrough or video, if you have one",
            ].map((x) => (
              <li key={x}>✓ {x}</li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-ink/60">
            You can start with the basics and save a private draft. A
            walkthrough is optional.
          </p>
        </aside>
      </div>
      <div className="mt-12 grid gap-7 border-y border-sand py-8 sm:grid-cols-3">
        {[
          [
            "Build your listing",
            "Add photos, practical details, hire inclusions and an optional Matterport or Kuula walkthrough.",
          ],
          [
            "Submit for review",
            "Styled checks your details before publication. Edits stay in a private draft until approved.",
          ],
          [
            "Welcome enquiries",
            "Respond to booking and viewing requests, suggest alternative dates and block dates booked elsewhere.",
          ],
        ].map(([h, p], i) => (
          <div key={h}>
            <p className="text-xs text-clay">0{i + 1}</p>
            <h2 className="mt-2 font-serif text-2xl">{h}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/60">{p}</p>
          </div>
        ))}
      </div>
      <section id="speak-to-us" className="mt-12 max-w-3xl scroll-mt-24">
        <h2 className="font-serif text-3xl">Prefer to speak to us first?</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink/60">
          Send your details and we can help prepare your listing. If you also
          hire out products, your supplier catalogue can be set up separately.
          Contracts, commission and payment arrangements are discussed before
          bookings go ahead.
        </p>
        <VenuePartnerForm />
      </section>
    </section>
  );
}
