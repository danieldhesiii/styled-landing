import Link from "next/link";
import HelpButton from "@/components/help/HelpButton";

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-sand bg-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Link href="/" className="font-serif text-2xl tracking-wide text-ink">
            Styled<span className="text-clay">.</span>
          </Link>
          <p className="mt-2 text-sm text-ink/50">
            Explore wedding looks, build a selection and request supplier confirmation.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-10 gap-y-6 text-sm"
        >
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-ink/40">
              Product
            </span>
            <HelpButton
              hideOnHome
              className="text-left text-ink/70 hover:text-ink"
            />
            <a href="/#features" className="text-ink/70 hover:text-ink">
              Features
            </a>
            <a href="/#faq" className="text-ink/70 hover:text-ink">
              FAQ
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-ink/40">
              For couples
            </span>
            <a href="/venues" className="text-ink/70 hover:text-ink">
              Explore venues
            </a>
            <a href="/design?tab=orders" className="text-ink/70 hover:text-ink">
              My bookings
            </a>
            <a
              href="/design?tab=wedding"
              className="text-ink/70 hover:text-ink"
            >
              Design your wedding
            </a>
            <a href="/order" className="text-ink/70 hover:text-ink">
              Track your order
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-ink/40">
              Information & support
            </span>
            <Link href="/service-info" className="text-ink/70 hover:text-ink">Service information</Link>
            <Link href="/service-info#support" className="text-ink/70 hover:text-ink">Contact support</Link>
            <Link href="/privacy" className="text-ink/70 hover:text-ink">Privacy</Link>
            <Link href="/terms" className="text-ink/70 hover:text-ink">Service terms</Link>
            <Link href="/login?mode=login" className="text-ink/70 hover:text-ink">Log in</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-ink/40">
              For businesses
            </span>
            <a href="/business" className="text-ink/70 hover:text-ink">
              Business workspaces
            </a>
            <a href="/venues/partner" className="text-ink/70 hover:text-ink">
              List your venue
            </a>
            <a href="/venue-portal" className="text-ink/70 hover:text-ink">
              Venue workspace
            </a>
            <a href="/suppliers/join" className="text-ink/70 hover:text-ink">
              Join as a supplier
            </a>
            <a href="/portal/login" className="text-ink/70 hover:text-ink">
              Supplier workspace
            </a>
          </div>
        </nav>
      </div>
      <div className="border-t border-sand py-6 text-center text-xs text-ink/40">
        Styled · Coverage depends on the supplier and venue · Images are illustrative.
      </div>
    </footer>
  );
}
