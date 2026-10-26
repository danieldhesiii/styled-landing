import Link from "next/link";
export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-sand bg-cream">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-7">
        <Link href="/" className="font-serif text-xl text-ink">
          Styled<span className="text-clay">.</span>
        </Link>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink/70"
        >
          <Link
            href="/support"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Help & support
          </Link>
          <Link
            href="/service-info"
            className="inline-flex min-h-11 items-center"
          >
            Service information
          </Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center">
            Privacy
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center">
            Terms
          </Link>
          <Link href="/business" className="inline-flex min-h-11 items-center">
            For businesses
          </Link>
        </nav>
      </div>
    </footer>
  );
}
