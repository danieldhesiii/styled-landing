import SupportContent from "@/components/support/SupportContent";
import Link from "next/link";
export const metadata = {
  title: "Help & support · Styled",
  description:
    "Ask Styled a question, get help with a request, or find answers about planning and business workspaces.",
  alternates: { canonical: "/support" },
};
export default function SupportPage() {
  return (
    <section className="mx-auto max-w-2xl py-10 sm:py-14">
      <h1 className="font-serif text-4xl">Help & support</h1>
      <p className="mb-6 mt-3 text-sm text-ink/70">
        Get help with your plans, requests or business workspace.
      </p>
      <SupportContent />
      <p className="mt-6 text-sm leading-relaxed text-ink/80">
        For complaints or access help, include your reference and what you need.
        Can’t sign in? Use email above.
      </p>
      <nav aria-label="Support information" className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/80">
        <Link href="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-4">How we use your information</Link>
        <Link href="/service-info" className="inline-flex min-h-11 items-center underline underline-offset-4">Requests, bookings & support</Link>
      </nav>
    </section>
  );
}
