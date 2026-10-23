import Link from "next/link";
export const metadata = { title: "For venues & suppliers · Styled" };
export default function BusinessPage() {
  return (
    <section className="py-12 sm:py-16">
      <p className="text-xs uppercase tracking-widest text-clay">
        For businesses
      </p>
      <h1 className="mt-4 max-w-3xl font-serif text-5xl sm:text-6xl">
        Your business on Styled
      </h1>
      <p className="mt-5 max-w-2xl leading-relaxed text-ink/60">
        Choose the workspace for what your business offers. Venue listings and
        supplier products have separate management tools, while customers plan
        their wedding in their own space.
      </p>
      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <section className="border-t border-sand pt-6">
          <h2 className="font-serif text-3xl">Venues</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/60">
            Publish your venue, add photography, video and walkthroughs, and
            respond to viewing and booking requests. Create a private draft
            before review.
          </p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm">
            <Link
              href="/venues/partner"
              className="rounded-full bg-ink px-5 py-3 text-cream"
            >
              List your venue
            </Link>
            <Link href="/venue-portal" className="self-center underline">
              Open venue workspace →
            </Link>
          </div>
        </section>
        <section className="border-t border-sand pt-6">
          <h2 className="font-serif text-3xl">Suppliers</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/60">
            Manage the products couples can hire or buy, stock availability and
            fulfilment of supplier orders. Apply to join, or sign in to an
            existing supplier account.
          </p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm">
            <Link
              href="/suppliers/join"
              className="rounded-full bg-ink px-5 py-3 text-cream"
            >
              Join as a supplier
            </Link>
            <Link href="/portal/login" className="self-center underline">
              Open supplier workspace →
            </Link>
          </div>
        </section>
      </div>
      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-ink/60">
        Offer both a venue and hire products? You can use both workspaces with
        the same account once Styled links your supplier access. Contact{" "}
        <a href="mailto:support@styleduk.com" className="underline">
          support@styleduk.com
        </a>{" "}
        for setup.
      </p>
      <Link
        href="/design?tab=wedding"
        className="mt-8 inline-block text-sm underline"
      >
        Planning your own wedding? Open your wedding plan →
      </Link>
    </section>
  );
}
