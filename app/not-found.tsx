import Link from "next/link";

// Branded 404, shown for any unmatched route (and anything that calls notFound()).
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 text-center text-ink">
      <Link href="/" className="font-serif text-3xl tracking-wide">
        Styled<span className="text-clay">.</span>
      </Link>
      <p className="mt-8 font-serif text-5xl">Page not found</p>
      <p className="mt-3 max-w-sm text-ink/60">
        The page you&apos;re after doesn&apos;t exist, or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90">
          Back to the site
        </Link>
        <Link href="/design" className="rounded-full border border-ink/20 px-6 py-3 text-sm text-ink hover:border-ink/40">
          Design your wedding
        </Link>
      </div>
    </div>
  );
}
