import Link from "next/link";
import { headers } from "next/headers";
import { loadPublicSupplier } from "@/lib/server/suppliers";
import { SUPPLIER_DEMO_ID, supplierDemoAvailable } from "@/lib/supplier-demo";
export default async function DemoSupplierPreview() {
  const host = (await headers()).get("host")?.split(":")[0] || "";
  if (!supplierDemoAvailable(host, process.env.NEXT_PUBLIC_SUPABASE_URL || ""))
    return null;
  let supplier;
  try {
    supplier = await loadPublicSupplier(SUPPLIER_DEMO_ID);
  } catch {
    return null;
  }
  if (!supplier) return null;
  return (
    <section
      aria-labelledby="supplier-demo-title"
      className="my-10 flex flex-col justify-between gap-5 rounded-2xl border border-sand bg-white p-6 sm:flex-row sm:items-center sm:p-8"
    >
      <div>
        <p className="text-xs uppercase tracking-[.18em] text-clay">
          Try the experience
        </p>
        <h2 id="supplier-demo-title" className="mt-3 font-serif text-3xl">
          {supplier.name}
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink/60">
          Explore sample pieces and send a message to our demo supplier.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3">
        <Link
          href={"/suppliers/" + SUPPLIER_DEMO_ID}
          className="inline-flex min-h-12 items-center rounded-full border border-sand px-5 text-sm"
        >
          View demo supplier
        </Link>
        <Link
          href={"/messages?supplier=" + SUPPLIER_DEMO_ID}
          className="inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-sm text-cream"
        >
          Message demo supplier
        </Link>
      </div>
    </section>
  );
}
