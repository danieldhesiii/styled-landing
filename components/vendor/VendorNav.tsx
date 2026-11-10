"use client";

import Link from "next/link";
import { SupportButton } from "@/components/support/SupportProvider";
import HelpButton from "@/components/help/HelpButton";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/portal", label: "Overview", match: (p: string) => p === "/portal" },
  {
    href: "/portal/requests",
    label: "Requests",
    match: (p: string) => p.startsWith("/portal/requests"),
  },
  {
    href: "/portal/products",
    label: "Products",
    match: (p: string) =>
      p.startsWith("/portal/products") || p.startsWith("/portal/import"),
  },
  {
    href: "/portal/availability",
    label: "Availability",
    match: (p: string) => p.startsWith("/portal/availability"),
  },
  {
    href: "/portal/business",
    label: "Business setup",
    match: (p: string) => p.startsWith("/portal/business"),
  },
];

export default function VendorNav({
  email,
  supplier,
}: {
  email: string;
  supplier: string;
}) {
  const pathname = usePathname();
  const router=useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    window.location.assign("/portal/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
        <Link
          href="/portal"
          className="flex min-w-0 flex-wrap items-center gap-2 font-serif text-xl tracking-wide text-ink"
        >
          <span>Styled<span className="text-clay">.</span></span>
          <span className="rounded-full bg-clay px-2 py-0.5 font-sans text-sm font-medium uppercase tracking-wider text-cream">
            Supplier workspace
          </span>
        </Link>
        <nav
          className="order-last hidden w-full items-center gap-2 overflow-x-auto border-t border-sand pt-3 sm:flex"
          aria-label="Supplier"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.match(pathname) ? "page" : undefined}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 py-3 text-sm transition-colors ${
                l.match(pathname)
                  ? "bg-ink text-cream"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <label className="order-last block w-full border-t border-sand pt-3 text-sm text-ink/65 sm:hidden">Workspace section
          <select value={LINKS.find(l=>l.match(pathname))?.href||"/portal"} onChange={e=>router.push(e.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-base text-ink">{LINKS.map(l=><option key={l.href} value={l.href}>{l.label}</option>)}</select>
        </label>
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-3 text-sm text-ink/50">
          <span className="hidden text-ink/70 lg:inline">{supplier}</span>

          <Link href="/suppliers" className="hidden min-h-11 items-center underline md:inline-flex">
            View customer site ↗
          </Link>

          <SupportButton
            label="Contact support"
            className="min-h-11 underline underline-offset-4"
          />
          <HelpButton
            topic="supplier_partners"
            className="hidden shrink-0 rounded-full border border-sand px-3 py-1.5 text-ink/70 sm:inline-flex"
          />
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 rounded-full border border-ink/15 px-3 text-ink/70 hover:border-ink/40 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
