import Link from "next/link";
import VendorApplication from "@/components/vendor/VendorApplication";
export const metadata = {
  title: "Become a supplier · Styled",
  description:
    "Apply to join Styled. Our team reviews your business before inviting you to your private supplier workspace.",
};
export default function SupplierJoinPage() {
  return (
    <div className="grid gap-10 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-16">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-clay">
          Styled for suppliers
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-tight">
          Your collection,
          <br />
          their wedding.
        </h1>
        <p className="mt-5 max-w-md text-ink/65">
          Share your products with couples planning their day. We review every
          supplier before providing account access.
        </p>
        <ol className="mt-8 space-y-5 text-sm">
          <li>
            <strong>01. Apply</strong>
            <p className="mt-1 text-ink/65">
              Tell us about your business and the area you cover.
            </p>
          </li>
          <li>
            <strong>02. Meet the team</strong>
            <p className="mt-1 text-ink/65">
              We review your range and agree the details with you.
            </p>
          </li>
          <li>
            <strong>03. Set up your account</strong>
            <p className="mt-1 text-ink/65">
              Open your email invitation, choose a password and start uploading
              products.
            </p>
          </li>
        </ol>
        <p className="mt-8 text-sm text-ink/65">
          No listing or subscription fee. Commission is agreed with you before
          joining and applies to confirmed bookings.
        </p>
        <p className="mt-6 border-t border-sand pt-5 text-sm text-ink/65">
          Your application email becomes your login. No shared or temporary
          password is needed.
        </p>
        <Link
          href="/portal/login"
          className="mt-5 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        >
          Already approved? Supplier log in →
        </Link>
      </section>
      <section className="rounded-2xl bg-white px-5 sm:px-8">
        <VendorApplication embedded />
      </section>
    </div>
  );
}
