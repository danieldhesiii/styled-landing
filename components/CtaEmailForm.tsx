import Link from "next/link";

// The account invitation opens registration directly; it does not collect a marketing signup.
export default function CtaEmailForm() {
  return <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-3">
    <Link href="/login?mode=signup" className="rounded-full bg-ink px-6 py-3 text-cream hover:bg-ink/90">Create account</Link>
    <Link href="/login?mode=login" className="rounded-full border border-sand px-6 py-3 text-ink hover:border-clay">Log in</Link>
  </div>;
}
