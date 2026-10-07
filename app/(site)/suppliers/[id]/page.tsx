import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadPublicSupplier } from "@/lib/server/suppliers";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { formatGBP } from "@/lib/quote";

// A supplier's public profile: who they are and every piece they offer on Styled.
// Doubles as shareable outreach collateral ("here's your page on Styled").
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supplier = await loadPublicSupplier(id);
  if (!supplier) return { title: "Supplier · Styled" };
  return {
    title: `${supplier.name} · Styled`,
    description: `${supplier.name} (${supplier.area}) on Styled — ${supplier.productCount} wedding pieces you can design with and order to your venue.`,
  };
}

export default async function SupplierProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await loadPublicSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="py-12">
      <Link href="/suppliers" className="text-sm text-ink/50 hover:text-ink">← All suppliers</Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
        {supplier.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={supplier.logoUrl} alt="" className="h-20 w-20 shrink-0 rounded-full border border-sand object-cover" />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-cream font-serif text-3xl text-clay">
            {supplier.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">{supplier.name}</h1>
          <p className="mt-1 text-ink/60">{supplier.area}</p>
          <p className="mt-1 text-sm text-ink/40">
            {supplier.productCount} {supplier.productCount === 1 ? "piece" : "pieces"} on Styled
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {supplier.products.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={p.name} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center text-4xl" style={{ backgroundColor: p.swatch }}>
                {p.icon}
              </div>
            )}
            <div className="p-5">
              <p className="text-xs font-medium text-clay">{vendorCategoryLabel(p.category)}</p>
              <h2 className="mt-1 font-serif text-xl text-ink">{p.name}</h2>
              <p className="mt-2 text-sm text-ink/60">
                {formatGBP(p.unitPrice)} <span className="text-ink/40">{p.unit}</span>
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-3xl border border-clay/30 bg-blush/20 px-6 py-10 text-center sm:px-10">
        <h2 className="font-serif text-2xl text-ink">Design with {supplier.name}&apos;s pieces</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          Add them to your venue in the design studio, see how they look, and order everything in one go.
        </p>
        <Link href="/design" className="mt-5 inline-block rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90">
          Open the design studio
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-ink/40">Prices and images are illustrative. Availability is confirmed when you order.</p>
    </div>
  );
}
