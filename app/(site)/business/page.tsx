import Link from "next/link";
export const metadata = { title: "For venues & suppliers · Styled" };
export default function BusinessPage() {
  return (
    <section className="py-12 sm:py-16">
      <p className="text-sm uppercase tracking-widest text-clay">
        For businesses
      </p>
      <h1 className="mt-4 max-w-3xl font-serif text-5xl sm:text-6xl">
        Choose your business workspace
      </h1>
      <p className="mt-5 max-w-2xl leading-relaxed text-ink/60">
        Choose a workspace to manage your venue or products.
      </p>
      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <section className="border-t border-sand pt-6">
          <h2 className="font-serif text-3xl">Venue owners</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/60">
            Manage your listing, photos and enquiries. Submit your draft for review.
          </p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm">
            <Link
              href="/venues/partner"
              className="rounded-full bg-ink px-5 py-3 text-cream"
            >
              List your venue
            </Link>
            <Link href="/venue-portal" className="self-center underline">
              Venue login →
            </Link>

          </div>
          <Link href="/venues/partner/preview" className="mt-4 inline-flex min-h-11 items-center text-sm text-ink/60 underline">Preview venue settings →</Link>
        </section>
        <section className="border-t border-sand pt-6">
          <h2 className="font-serif text-3xl">Product suppliers</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/60">
            Manage products, availability and supplier requests.
          </p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm">
            <Link
              href="/suppliers/join"
              className="rounded-full bg-ink px-5 py-3 text-cream"
            >
              Join as a supplier
            </Link>
            <Link href="/portal/login" className="self-center underline">
              Supplier login →
            </Link>

          </div>
          <Link href="/business/supplier-tour" className="mt-4 inline-flex min-h-11 items-center text-sm text-ink/60 underline">Preview workspace →</Link>
        </section>
      </div>
      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-ink/60">
        Need both workspaces? Ask{" "}
        <a href="mailto:support@styleduk.com" className="underline">
          support@styleduk.com
        </a>{" "}
        to link your access.
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
