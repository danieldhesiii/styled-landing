"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/admin", label: "Orders", match: (p: string) => p === "/admin" || p.startsWith("/admin/orders") },
  { href: "/admin/accounts", label: "Customers", match: (p: string) => p.startsWith("/admin/accounts") },
  { href: "/admin/availability", label: "Availability", match: (p: string) => p.startsWith("/admin/availability") },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  async function signOut() {
    await createClient().auth.signOut();
    window.location.assign("/admin/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
        <Link href="/admin" className="font-serif text-xl tracking-wide text-ink">
          Styled<span className="text-clay">.</span>
          <span className="ml-2 rounded-full bg-ink px-2 py-0.5 align-middle font-sans text-[10px] font-medium uppercase tracking-wider text-cream">Staff</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Staff">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.match(pathname) ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                l.match(pathname) ? "bg-ink text-cream" : "text-ink/60 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-ink/50">
          <span className="hidden sm:inline">{email}</span>
          <button type="button" onClick={signOut} className="rounded-full border border-ink/15 px-3 py-1.5 text-ink/70 hover:border-ink/40 hover:text-ink">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
