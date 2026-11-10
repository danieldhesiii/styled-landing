"use client";
import Link from "next/link";
import {SupportButton} from "@/components/support/SupportProvider";
import HelpButton from "@/components/help/HelpButton";
import { createClient } from "@/lib/supabase/client";

export default function VenueWorkspaceHeader() {
  return (
    <header className="border-b border-sand bg-cream">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/venue-portal" className="font-serif text-2xl">
          Styled<span className="text-clay">.</span>
          <span className="ml-3 align-middle font-sans text-sm text-ink/60">
            Venue workspace
          </span>
        </Link>
        <nav
          aria-label="Venue workspace account"
          className="hidden flex-wrap items-center gap-4 text-sm text-ink/70 sm:flex"
        >
          <Link href="/venues">View customer site ↗</Link>
          <Link href="/venues/partner">Venue owner guide</Link>
          <SupportButton label="Contact support" className="min-h-11 underline underline-offset-4" />
          <HelpButton
            topic="venue_partners"
            label="Help"
            className="rounded-full border border-sand px-3 py-2"
          />
          <button
            type="button"
            onClick={async () => {
              await createClient().auth.signOut();
              window.location.assign("/login?next=/venue-portal");
            }}
            className="rounded-full border border-sand px-3 py-2"
          >
            Sign out
          </button>
        </nav>
        <details className="relative text-sm sm:hidden"><summary className="min-h-11 cursor-pointer rounded-full border border-sand px-4 py-3">Help & account</summary><nav aria-label="Venue help and account" className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-sand bg-white p-3 shadow-lg"><Link href="/venues" className="block min-h-11 px-2 py-3">View customer site ↗</Link><Link href="/venues/partner" className="block min-h-11 px-2 py-3">Venue owner guide</Link><SupportButton label="Contact support" className="block min-h-11 w-full px-2 py-3 text-left"/><HelpButton topic="venue_partners" label="How to use this workspace" className="block min-h-11 w-full px-2 py-3 text-left"/><button type="button" className="block min-h-11 w-full px-2 py-3 text-left" onClick={async()=>{await createClient().auth.signOut();window.location.assign("/login?next=/venue-portal");}}>Sign out</button></nav></details>
      </div>
    </header>
  );
}
