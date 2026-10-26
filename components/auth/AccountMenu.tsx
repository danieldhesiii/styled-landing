"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/session/useUser";
import {SupportButton} from "@/components/support/SupportProvider";
import AuthDialog from "@/components/auth/AuthDialog";

const CHIP =
  "flex items-center gap-1.5 rounded-full border border-sand min-h-11 px-2 py-1.5 sm:px-4 text-xs text-ink/50 hover:border-clay/50 hover:text-ink transition-colors";

// Header control: a Log in / Sign up button for guests, or the signed-in email
// with a dropdown (My orders, Log out) for couples with an account.
export default function AccountMenu({
  onOpenOrders,
  onOpenHelp,
}: {
  onOpenOrders?: () => void;
  onOpenHelp?: () => void;
}) {
  const { isAnonymous, email, loading } = useUser();
  const trigger=useRef<HTMLButtonElement>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Staff accounts also get a shortcut into the /admin dashboard.
  const [isStaff, setIsStaff] = useState(false);
  const [workspaces, setWorkspaces] = useState({
    venue: false,
    supplier: false,
  });
  useEffect(() => {
    setWorkspaces({ venue: false, supplier: false });
    if (!email) return;
    let active = true;
    fetch("/api/workspaces", { cache: "no-store" })
      .then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          if (active)
            setWorkspaces({
              venue: d.venue === true,
              supplier: d.supplier === true,
            });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [email]);

  useEffect(() => {
    if (!email) {
      setIsStaff(false);
      return;
    }
    let active = true;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => {
        if (active) setIsStaff(r.ok);
      })
      .catch(() => {
        if (active) setIsStaff(false);
      });
    return () => {
      active = false;
    };
  }, [email]);

  async function logout() {
    await createClient().auth.signOut();
    // GuestSession mints a fresh anonymous guest on the next load.
    window.location.reload();
  }

  if (loading) return null;

  // Guest — offer to create an account or log in.
  if (isAnonymous || !email) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className={CHIP}
        >
          <span className="text-[11px] text-clay">◔</span> Log in / Sign up
        </button>
        {authOpen && (
          <AuthDialog initialMode="signup" onClose={() => setAuthOpen(false)} />
        )}
      </>
    );
  }

  // Signed in — show the account with a small menu.
  const initial = email.charAt(0).toUpperCase();
  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") {setMenuOpen(false);trigger.current?.focus();}
      }}
    >
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className={CHIP}
        ref={trigger}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={menuOpen}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-clay text-[9px] font-medium text-cream">
          {initial}
        </span>
        <span className="hidden max-w-[12ch] truncate sm:inline">{email}</span>
      </button>
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-sand bg-white py-1 shadow-xl">
            <p className="truncate px-4 py-2 text-[11px] text-ink/40">
              {email}
            </p>
            {isStaff && (
              <a
                href="/admin"
                className="flex items-center justify-between px-4 py-2 text-left text-sm text-ink/70 hover:bg-cream hover:text-ink transition-colors"
              >
                Admin dashboard
                <span className="rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-cream">
                  Staff
                </span>
              </a>
            )}
            {onOpenOrders ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenOrders();
                }}
                className="block w-full px-4 py-2 text-left text-sm text-ink/70 hover:bg-cream"
              >
                My bookings
              </button>
            ) : (
              <a
                href="/design?tab=orders"
                className="block px-4 py-2 text-sm text-ink/70 hover:bg-cream"
              >
                My bookings
              </a>
            )}
            {onOpenHelp && (
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-sm hover:bg-cream"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenHelp();
                }}
              >
                How it works
              </button>
            )}
            <SupportButton label="Contact support" className="block min-h-11 w-full px-4 py-2 text-left text-sm text-ink/70 hover:bg-cream" />
            {workspaces.venue && (
              <a
                href="/venue-portal"
                className="block border-t border-sand px-4 py-2 text-sm text-ink/70 hover:bg-cream"
              >
                Switch to venue workspace ↗
              </a>
            )}
            {workspaces.supplier && (
              <a
                href="/portal"
                className="block px-4 py-2 text-sm text-ink/70 hover:bg-cream"
              >
                Switch to supplier workspace ↗
              </a>
            )}
            <button
              type="button"
              onClick={logout}
              className="block w-full px-4 py-2 text-left text-sm text-ink/70 hover:bg-cream hover:text-ink transition-colors"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
