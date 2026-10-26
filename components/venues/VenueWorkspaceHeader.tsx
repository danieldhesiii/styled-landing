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
          <span className="ml-3 align-middle font-sans text-xs text-ink/60">
            Venue workspace
          </span>
        </Link>
        <nav
          aria-label="Venue workspace account"
          className="flex flex-wrap items-center gap-4 text-xs text-ink/70"
        >
          <Link href="/venues">View customer site ↗</Link>
          <Link href="/business">Business workspaces</Link>
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
      </div>
    </header>
  );
}
