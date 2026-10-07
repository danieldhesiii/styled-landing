"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/session/useUser";
import AuthDialog from "@/components/auth/AuthDialog";

const CHIP =
  "flex items-center gap-1.5 rounded-full border border-sand px-4 py-1.5 text-xs text-ink/50 hover:border-clay/50 hover:text-ink transition-colors";

// Header control: a Log in / Sign up button for guests, or the signed-in email
// with a dropdown (My orders, Log out) for couples with an account.
export default function AccountMenu({ onOpenOrders }: { onOpenOrders?: () => void }) {
  const { isAnonymous, email, loading } = useUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        <button type="button" onClick={() => setAuthOpen(true)} className={CHIP}>
          <span className="text-[11px] text-clay">◔</span> Log in / Sign up
        </button>
        {authOpen && <AuthDialog initialMode="signup" onClose={() => setAuthOpen(false)} />}
      </>
    );
  }

  // Signed in — show the account with a small menu.
  const initial = email.charAt(0).toUpperCase();
  return (
    <div className="relative">
      <button type="button" onClick={() => setMenuOpen((o) => !o)} className={CHIP} aria-haspopup="menu" aria-expanded={menuOpen}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-clay text-[9px] font-medium text-cream">
          {initial}
        </span>
        <span className="max-w-[12ch] truncate">{email}</span>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-sand bg-white py-1 shadow-xl">
            <p className="truncate px-4 py-2 text-[11px] text-ink/40">{email}</p>
            {onOpenOrders && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onOpenOrders(); }}
                className="block w-full px-4 py-2 text-left text-sm text-ink/70 hover:bg-cream hover:text-ink transition-colors"
              >
                My orders
              </button>
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
