import { DEMO_VENUES } from "@/lib/demo-venues";
import { VenueCards } from "./VenueCollection";

export default function DemoVenues() {
  return (
    <section
      id="demo-venues"
      aria-label="Demo venue previews"
      className="mt-12 border-t border-sand pt-8"
    >
      <p className="text-sm uppercase tracking-widest text-clay">
        Try the booking journey
      </p>
      <h2 className="mt-3 font-serif text-3xl">Explore three demo venues</h2>
      <p className="mb-7 mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
        Try a request and venue reply. Nothing is sent or reserved. All details are fictional; search filters do not apply.
      </p>
      <VenueCards venues={DEMO_VENUES} />
    </section>
  );
}
