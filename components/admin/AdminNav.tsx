"use client";

import Link from "next/link";
import { useRouter,usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  {href:"/admin/pilot",label:"Pilot workflow template",match:(p:string)=>p.startsWith("/admin/pilot")},
  {href:"/admin/requests",label:"Request tracker",match:(p:string)=>p.startsWith("/admin/requests")},
  {href:"/admin/operations",label:"Service checks",match:(p:string)=>p.startsWith("/admin/operations")},
  {href:"/admin/venue-notifications",label:"Venue notifications",match:(p:string)=>p.startsWith("/admin/venue-notifications")},
  {href:"/admin/support",label:"Customer questions",match:(p:string)=>p.startsWith("/admin/support")},
  {
    href: "/admin/locations",
    label: "Locations",
    match: (p: string) => p.startsWith("/admin/locations"),
  },
  {
    href: "/admin/venues",
    label: "Venue reviews",
    match: (p: string) => p.startsWith("/admin/venues"),
  },
  {
    href: "/admin",
    label: "Orders",
    match: (p: string) => p === "/admin" || p.startsWith("/admin/orders"),
  },
  {
    href: "/admin/accounts",
    label: "Customers",
    match: (p: string) => p.startsWith("/admin/accounts"),
  },
  {
    href: "/admin/vendors",
    label: "Applications",
    match: (p: string) => p.startsWith("/admin/vendors"),
  },
  {
    href: "/admin/suppliers",
    label: "Suppliers",
    match: (p: string) => p.startsWith("/admin/suppliers"),
  },
  {
    href: "/admin/availability",
    label: "Products & availability",
    match: (p: string) => p.startsWith("/admin/availability"),
  },
  {
    href: "/admin/guide",
    label: "Guide",
    match: (p: string) => p.startsWith("/admin/guide"),
  },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname(),router=useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3">
        <Link
          href="/admin"
          className="font-serif text-xl tracking-wide text-ink"
        >
          Styled<span className="text-clay">.</span>
          <span className="ml-2 rounded-full bg-ink px-2 py-0.5 align-middle font-sans text-[10px] font-medium uppercase tracking-wider text-cream">
            Staff
          </span>
        </Link>
        <label className="min-w-0 flex-1 text-xs text-ink/60">Staff section<select aria-label="Staff section" value={LINKS.find(l=>l.match(pathname))?.href||"/admin"} onChange={e=>router.push(e.target.value)} className="mt-1 block min-h-11 w-full max-w-xs rounded-xl border border-sand bg-white px-3 text-sm text-ink">{LINKS.map(l=><option key={l.href} value={l.href}>{l.label}</option>)}</select></label>
        <div className="ml-auto flex items-center gap-3 text-xs text-ink/50">
          <span className="hidden sm:inline">{email}</span>
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
