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

export default async function SuppliersIndexPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const suppliers = (await loadPublicSuppliers(true)).filter(s =>
    (s.name + " " + s.area).toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(suppliers.length / 12));
  const page = Math.max(1, Math.min(pages, Number.parseInt(params.page || "1", 10) || 1));
  const pageHref = (n: number) => "/suppliers?" + new URLSearchParams({ q: query, page: String(n) });

  return (
    <div className="py-12">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">
        Meet our suppliers
      </h1>
      <p className="mt-3 max-w-xl text-ink/60">
        Explore suppliers and their products. Prices, availability and delivery need confirmation.
      </p>

      <form action="/suppliers" className="mt-6 flex flex-wrap gap-2">
        <input type="search" name="q" aria-label="Search suppliers by name or area" placeholder="Supplier name or area" defaultValue={query} className="min-w-0 rounded-lg border border-sand bg-white px-4 py-2" />
        <button className="rounded-full bg-ink px-5 py-2 text-cream">Search</button>
        {query && <Link href="/suppliers" className="self-center px-2 underline">Clear</Link>}
      </form>
      {suppliers.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-sand px-6 py-16 text-center text-sm text-ink/50">
          {query ? "No suppliers match your search." : "No suppliers are listed yet."}
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.slice((page - 1) * 12, page * 12).map((s) => (
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
                <p className="mt-1 text-sm text-ink/40">
                  {s.productCount} {s.productCount === 1 ? "piece" : "pieces"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {pages > 1 && <nav aria-label="Supplier pages" className="mt-6 flex items-center gap-5">
        {page > 1 && <Link href={pageHref(page - 1)}>Previous</Link>}
        <span>Page {page} of {pages}</span>
        {page < pages && <Link href={pageHref(page + 1)}>Next</Link>}
      </nav>}
    </div>
  );
}
