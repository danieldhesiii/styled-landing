import Link from "next/link";
import VendorApplication from "@/components/vendor/VendorApplication";
export const metadata = { title: "Join Styled as a supplier" };
export default function SupplierJoinPage() {
  return (
    <>
      <section className="max-w-3xl pt-16">
        <p className="text-sm uppercase tracking-widest text-clay">
          For independent wedding suppliers
        </p>
        <h1 className="mt-4 font-serif text-5xl">
          Your pieces, part of their day
        </h1>
        <p className="mt-5 text-ink/60">
          Share your range with couples planning their wedding.
        </p>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          <li>
            <h2 className="font-serif text-2xl">1. Share your range</h2>
            <p className="mt-2 text-sm text-ink/60">
              Apply with your business details and the pieces you offer.
            </p>
          </li>
          <li>
            <h2 className="font-serif text-2xl">2. Help couples explore</h2>
            <p className="mt-2 text-sm text-ink/60">
              Show your products in the catalogue and visualiser.
            </p>
          </li>
          <li>
            <h2 className="font-serif text-2xl">3. Manage your orders</h2>
            <p className="mt-2 text-sm text-ink/60">
              Review requests and update products and availability.
            </p>
          </li>
        </ol>
        <div className="mt-8 border-y border-sand py-6">
          <h2 className="font-serif text-2xl">Simple, agreed terms</h2>
          <p className="mt-2 text-ink/60">
            No listing or subscription fee. Commission is agreed with you before
            joining and applies to confirmed bookings.
          </p>
          <p className="mt-3 text-sm text-ink/60">
            Have product photos, stock details and delivery or collection options ready.
          </p>
        </div>
        <Link
          href="/portal/login"
          className="mt-5 inline-block text-sm underline"
        >
          Already a supplier? Sign in
        </Link>
      </section>
      <VendorApplication embedded />
    </>
  );
}
