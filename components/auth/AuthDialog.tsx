"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "login";

interface Props {
  initialMode?: Mode;
  onClose: () => void;
  onAuthed?: () => void;
}

// Couple sign-up / log-in. Sign-up upgrades the current anonymous guest into a
// permanent account in place (same user id), so everything they've already made
// — renders, designs, saved looks — carries straight over. Returning couples log
// in with email + password.
export default function AuthDialog({ initialMode = "signup", onClose, onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function friendly(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered"))
      return "That email already has an account — try logging in instead.";
    if (m.includes("invalid login")) return "That email and password don't match.";
    if (m.includes("at least")) return "Your password needs to be at least 6 characters.";
    if (m.includes("valid email")) return "Please enter a valid email address.";
    return message;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data: { user } } = await supabase.auth.getUser();
        // Upgrade the anonymous guest in place; fall back to a fresh sign-up.
        const res = user?.is_anonymous
          ? await supabase.auth.updateUser({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });
        if (res.error) throw res.error;

        // If the project requires email confirmation, the account isn't live yet.
        const { data: after } = await supabase.auth.getUser();
        if (after.user && !after.user.is_anonymous && after.user.email) {
          onAuthed?.();
          onClose();
        } else {
          setNotice("Almost there — check your email for a link to confirm your account.");
          setBusy(false);
        }
      } else {
        const res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (res.error) throw res.error;
        onAuthed?.();
        onClose();
      }
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : "Something went wrong. Please try again."));
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <form
          onSubmit={submit}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl border border-sand bg-white p-7 shadow-2xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-serif text-xl text-ink">
                Styled<span className="text-clay">.</span>
              </p>
              <h2 className="mt-3 font-serif text-2xl text-ink">
                {isSignup ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mt-1 text-xs text-ink/50">
                {isSignup
                  ? "Keep your looks and designs, and pick up on any device."
                  : "Log in to find your saved looks and orders."}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sand text-ink/40 hover:border-clay hover:text-ink transition-colors">
              ×
            </button>
          </div>

          <label htmlFor="auth-email" className="mt-6 block text-sm font-medium text-ink">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-sand bg-cream/50 px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
          />

          <label htmlFor="auth-password" className="mt-4 block text-sm font-medium text-ink">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-sand bg-cream/50 px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
          />
          {isSignup && <p className="mt-1.5 text-[11px] text-ink/40">At least 6 characters.</p>}

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-blush/30 px-4 py-3 text-sm text-ink/80">{error}</p>
          )}
          {notice && (
            <p className="mt-4 rounded-xl bg-sage/15 px-4 py-3 text-sm text-ink/80">{notice}</p>
          )}

          <button
            type="submit"
            disabled={busy || !email || password.length < 6}
            className="mt-6 w-full rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>

          <p className="mt-4 text-center text-xs text-ink/50">
            {isSignup ? "Already have an account? " : "New here? "}
            <button
              type="button"
              onClick={() => { setMode(isSignup ? "login" : "signup"); setError(null); setNotice(null); }}
              className="text-clay hover:underline"
            >
              {isSignup ? "Log in" : "Create an account"}
            </button>
          </p>
        </form>
      </div>
    </>
  );
}
