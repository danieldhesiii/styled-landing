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
          <p className="text-sm uppercase tracking-widest text-clay">
            For venue owners & teams
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-5xl sm:text-6xl">
            List and manage your venue
          </h1>
          <p className="mt-6 max-w-xl leading-relaxed text-ink/70">
            Manage your listing, enquiries and preferred suppliers.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/venue-portal"
              className="rounded-full bg-ink px-6 py-3 text-sm text-cream"
            >
              Start your venue listing
            </Link>
            <Link href="/venue-portal" className="inline-flex min-h-11 items-center text-sm underline">Already listed? Venue login →</Link>
            <a href="#speak-to-us" className="self-center text-sm underline">
              Talk to Styled first
            </a>
          </div>
          <Link href="/venues/partner/preview" className="mt-4 inline-flex min-h-11 items-center text-sm text-clay underline underline-offset-4">Preview venue settings →</Link>
        </div>
        <aside className="self-start rounded-2xl bg-white p-7">
          <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">What you’ll need</summary>
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
          <p className="mt-5 text-sm leading-relaxed text-ink/60">
            Start with the basics. Walkthroughs are optional.
          </p>
        </details></aside>
      </div>
      <details className="mt-8 border-t border-sand pt-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Supplier options and listing review</summary><section aria-labelledby="supplier-choice-heading" className="mt-5">
        <h2 id="supplier-choice-heading" className="font-serif text-3xl">Keep control of your supplier network</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">Choose one route in Suppliers &amp; booking inside your venue workspace. Your listing shows couples how your venue works.</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            ["Your own suppliers", "Share your recommended local businesses. Couples stay with your venue team and its suppliers, without being directed to the Styled catalogue."],
            ["Your approved range on Styled", "Invite your preferred suppliers to join Styled. Once approved and linked by our team, only their catalogue products appear for your venue."],
            ["The wider Styled catalogue", "Allow couples to explore Styled suppliers. You can set a local distance limit around your venue."],
          ].map(([title, text]) => <div key={title} className="border-l-2 border-clay/40 pl-4"><h3 className="font-medium">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink/65">{text}</p></div>)}
        </div>
        <details className="mt-6 max-w-2xl text-sm text-ink/65">
          <summary className="min-h-11 cursor-pointer py-3 text-ink underline underline-offset-4">Booking systems and local sourcing</summary>
          <p className="mt-2 leading-relaxed">Enquiries reach your venue workspace. You can also link to your existing booking system. A link does not automatically sync calendars or confirm a booking. Local distance filters use verified locations and approximate miles; they do not certify sustainability.</p>
        </details>
      </section>
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
            <p className="text-sm text-clay">0{i + 1}</p>
            <h2 className="mt-2 font-serif text-2xl">{h}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/60">{p}</p>
          </div>
        ))}
      </div>
      </details>
      <section id="speak-to-us" className="mt-12 max-w-3xl scroll-mt-24">
        <h2 className="font-serif text-3xl">Prefer to speak to us first?</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink/60">
          Send your venue details. Contracts, commission and payment arrangements are agreed before bookings.
        </p>
        <VenuePartnerForm />
      </section>
    </section>
  );
}
