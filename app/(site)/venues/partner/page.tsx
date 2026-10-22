import VenuePartnerForm from "@/components/venues/VenuePartnerForm";
import Link from "next/link";
export const metadata = { title: "Venue partnerships · Styled" };
export default function VenuePartnerPage() {
  return (
    <section className="max-w-3xl py-16">
      <p className="text-xs uppercase tracking-widest text-clay">
        For venue owners
      </p>
      <h1 className="mt-4 font-serif text-5xl">
        Let couples imagine their day in your space
      </h1>
      <p className="mt-6 leading-relaxed text-ink/70">
        We’re building our first venue partnerships. Share your venue,
        photography and styling possibilities with couples exploring their
        wedding plans.
      </p>
      <p className="mt-4 leading-relaxed text-ink/70">
        Tell us your venue name, location, capacity and website, along with the
        best person to contact. We’ll discuss what a pilot could look like
        together.
      </p>
      <VenuePartnerForm />
      <Link href="/venues" className="ml-5 inline-block py-3 text-sm underline">
        Back to venues
      </Link>
    </section>
  );
}
