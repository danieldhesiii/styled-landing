import { DEMO_VENUES } from "@/lib/demo-venues";
import { VenueCards } from "./VenueCollection";

export default function DemoVenues() {
  return (
    <section
      aria-label="Demo venue previews"
      className="mt-12 border-t border-sand pt-8"
    >
      <p className="text-xs uppercase tracking-widest text-clay">
        A preview of what’s coming
      </p>
      <h2 className="mt-3 font-serif text-3xl">Explore three demo venues</h2>
      <p className="mb-7 mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
        These fictional venues show the listing layout, including spaces for
        video and 3D walkthroughs. They cannot be booked. Images and capacities
        are illustrative, and search filters and date checks do not apply to
        these previews.
      </p>
      <VenueCards venues={DEMO_VENUES} />
    </section>
  );
}
