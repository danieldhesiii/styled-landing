import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-sand bg-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Link href="/" className="font-serif text-2xl tracking-wide text-ink">
            Styled<span className="text-clay">.</span>
          </Link>
          <p className="mt-2 text-sm text-ink/50">
            The planning &amp; design workspace for wedding planners.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-10 gap-y-6 text-sm">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-ink/40">Product</span>
            <a href="/#features" className="text-ink/70 hover:text-ink">Features</a>
            <a href="/#how" className="text-ink/70 hover:text-ink">How it works</a>
            <a href="/#faq" className="text-ink/70 hover:text-ink">FAQ</a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-ink/40">Get started</span>
            <a href="/#cta" className="text-ink/70 hover:text-ink">Get early access</a>
          </div>
        </nav>
      </div>
      <div className="border-t border-sand py-6 text-center text-xs text-ink/40">
        Styled · Early release. Renders are illustrative and prices are working estimates.
      </div>
    </footer>
  );
}
