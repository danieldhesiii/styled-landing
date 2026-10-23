import Link from "next/link";
import { loadPublicSuppliers } from "@/lib/server/suppliers";

// Public directory of suppliers on Styled. Each card links to that supplier's
// profile. Always rendered fresh so a newly onboarded supplier appears at once.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Our suppliers · Styled",
  description:
    "Explore wedding supplier profiles and catalogue pieces, subject to manual availability and quote confirmation.",
};

export default async function SuppliersIndexPage() {
  const suppliers = await loadPublicSuppliers();

  return (
    <div className="py-12">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">
        Meet our suppliers
      </h1>
      <p className="mt-3 max-w-xl text-ink/60">
        Explore supplier profiles and catalogue pieces for your wedding. Availability, final prices and delivery or collection are confirmed manually for your date and venue.
      </p>

      {suppliers.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-sand px-6 py-16 text-center text-sm text-ink/50">
          Our supplier network is being set up. Check back very soon.
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
                <img
                  src={s.logoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full border border-sand object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream font-serif text-xl text-clay">
                  {s.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-serif text-xl text-ink group-hover:text-clay">
                  {s.name}
                </h2>
                <p className="truncate text-sm text-ink/50">{s.area}</p>
                <p className="mt-1 text-xs text-ink/40">
                  {s.productCount} {s.productCount === 1 ? "piece" : "pieces"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}


    </div>
  );
}
