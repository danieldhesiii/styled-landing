import Link from "next/link";
import { loadPublicSuppliers } from "@/lib/server/suppliers";

// Public directory of suppliers on Styled. Each card links to that supplier's
// profile. Always rendered fresh so a newly onboarded supplier appears at once.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Our suppliers · Styled",
  description: "The hand-picked UK florists, décor, furniture and lighting suppliers you can design and order with on Styled.",
};

export default async function SuppliersIndexPage() {
  const suppliers = await loadPublicSuppliers();

  return (
    <div className="py-12">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">Meet our suppliers</h1>
      <p className="mt-3 max-w-xl text-ink/60">
        A hand-picked network of UK wedding suppliers. Every piece they offer is shoppable in the design studio
        and delivered to your venue.
      </p>

      {suppliers.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-sand px-6 py-16 text-center text-sm text-ink/50">
          Our supplier network is being set up — check back very soon.
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Link
              key={s.id}
              href={`/suppliers/${s.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-sand bg-white p-5 shadow-sm transition-colors hover:border-clay/50"
            >
              {s.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full border border-sand object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream font-serif text-xl text-clay">
                  {s.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-serif text-xl text-ink group-hover:text-clay">{s.name}</h2>
                <p className="truncate text-sm text-ink/50">{s.area}</p>
                <p className="mt-1 text-xs text-ink/40">{s.productCount} {s.productCount === 1 ? "piece" : "pieces"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-14 rounded-3xl border border-clay/30 bg-blush/20 px-6 py-10 text-center sm:px-10">
        <h2 className="font-serif text-2xl text-ink">Are you a wedding supplier?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          Reach couples designing their whole wedding around your pieces, delivered to the venue.
        </p>
        <Link href="/vendors" className="mt-5 inline-block rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90">
          List your business
        </Link>
      </div>
    </div>
  );
}
