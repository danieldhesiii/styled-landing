"use client";

import Link from "next/link";
import {SupportButton} from "@/components/support/SupportProvider";
import HelpButton from "@/components/help/HelpButton";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/portal", label: "Orders", match: (p: string) => p === "/portal" },
  {
    href: "/portal/products",
    label: "Products",
    match: (p: string) => p.startsWith("/portal/products"),
  },
  {
    href: "/portal/availability",
    label: "Availability",
    match: (p: string) => p.startsWith("/portal/availability"),
  },
  {
    href: "/portal/import",
    label: "Import stock",
    match: (p: string) => p.startsWith("/portal/import"),
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

  async function signOut() {
    await createClient().auth.signOut();
    window.location.assign("/portal/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 md:flex-nowrap md:gap-6 px-5 py-3">
        <Link
          href="/portal"
          className="font-serif text-xl tracking-wide text-ink"
        >
          Styled<span className="text-clay">.</span>
          <span className="ml-2 rounded-full bg-clay px-2 py-0.5 align-middle font-sans text-[10px] font-medium uppercase tracking-wider text-cream">
            Supplier workspace
          </span>
        </Link>
        <nav
          className="order-last flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1"
          aria-label="Supplier"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.match(pathname) ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                l.match(pathname)
                  ? "bg-ink text-cream"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex w-full min-w-0 flex-wrap items-center gap-3 text-xs text-ink/50 lg:w-auto">
          <span className="hidden text-ink/70 sm:inline">{supplier}</span>
          <span className="hidden text-ink/30 sm:inline">·</span>
          <span className="hidden sm:inline">{email}</span>
          <Link href="/suppliers" className="underline">
            View customer site ↗
          </Link>
          <Link href="/business" className="underline">
            Workspaces
          </Link>
          <SupportButton label="Contact support" className="min-h-11 underline underline-offset-4" />
          <HelpButton
            topic="supplier_partners"
            className="shrink-0 rounded-full border border-sand px-3 py-1.5 text-ink/70"
          />
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-ink/15 px-3 py-1.5 text-ink/70 hover:border-ink/40 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
