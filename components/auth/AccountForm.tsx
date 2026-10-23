"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authCallbackPath, safeLocalRedirect } from "@/lib/auth/navigation";
import { authError } from "@/lib/auth/messages";

type Mode = "signup" | "login";
export default function AccountForm({ initialMode = "signup", next = "/design", onAuthed }: {
  initialMode?: Mode; next?: string; onAuthed?: () => void;
}) {
  const id = useId();
  const [guest, setGuest] = useState<boolean | null>(null);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setGuest(!!data.user?.is_anonymous)).catch(() => setGuest(false));
  }, []);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const destination = safeLocalRedirect(next);
  const recovery = `/auth/recovery?${new URLSearchParams({ next: destination })}`;
  const isSignup = mode === "signup";

  function complete() {
    onAuthed?.();
    // A new document also resets account-scoped client state and restores it afresh.
    window.location.assign(destination);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    const supabase = createClient();
    try {
      const { data: { user: before } } = await supabase.auth.getUser();
      const callback = new URL(authCallbackPath(destination, isSignup && !!before?.is_anonymous), window.location.origin).href;
      if (isSignup) {
        const result = before?.is_anonymous
          ? await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: callback })
          : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: callback } });
        if (result.error) throw result.error;
        const { data: { user } } = await supabase.auth.getUser();
        if (before?.is_anonymous) {
          setNotice("Confirm your email using the link, then choose your password on the next screen. Keep using this browser to preserve your guest plans.");
          setPassword("");
          if (user && !user.is_anonymous && user.email_confirmed_at) window.location.assign(`/auth/reset?${new URLSearchParams({ next: destination })}`);
        } else if (user && !user.is_anonymous && user.email_confirmed_at) complete();
        else {
          setNotice("Check your email for a confirmation link, then sign in. If this address already has an account, use Log in or Forgot password.");
          setMode("login"); setPassword("");
        }
      } else {
        if (before?.is_anonymous) {
          const prepared = await fetch("/api/session/premerge", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
          });
          if (!prepared.ok) {
            setError("We couldn't safely prepare your guest work for transfer. Your guest session is still active. Retry before signing in, or contact support.");
            return;
          }
        }
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        if (!data.session || data.user.is_anonymous) throw new Error("No account session");
        if (before?.is_anonymous && before.id !== data.user.id) {
          // The HttpOnly proof was issued from the verified guest session before sign-in.
          const merged = await fetch("/api/session/merge", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }).catch(() => null);
          if (!merged?.ok) {
            setNotice("You are signed in, but we couldn't transfer your guest work. Contact support if anything is missing.");
            setPassword("");
            return;
          }
        }
        complete();
      }
    } catch (err) {
      setError(authError(err instanceof Error ? err.message : ""));
    } finally { setBusy(false); }
  }

  return <>
    <p className="mt-2 text-sm text-ink/70">{isSignup ? "Save your wedding plans, looks and requests." : "Continue with your saved plans and bookings."}</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label htmlFor={`${id}-email`} className="block text-sm font-medium text-ink">Email</label>
      <input id={`${id}-email`} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-sand px-4 py-3 text-ink focus:ring-2 focus:ring-clay" />
      {!(isSignup && guest) && <><label htmlFor={`${id}-password`} className="block text-sm font-medium text-ink">Password</label>
      <input id={`${id}-password`} type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 6 : undefined} required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-sand px-4 py-3 text-ink focus:ring-2 focus:ring-clay" />
      </>}
      {isSignup && <p className="text-xs text-ink/70">{guest ? "Confirm your email first, then choose a password to keep your guest plans." : "At least 6 characters. Email confirmation may be required."}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-ink/80">{notice}</p>}
      <button disabled={busy || (isSignup && guest === null)} className="w-full rounded-full bg-ink px-6 py-3 text-cream disabled:opacity-50">{busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}</button>
    </form>
    {notice?.startsWith("You are signed in") && <a href={destination} className="mt-3 block text-sm underline">Continue to your account</a>}
    <button type="button" disabled={busy} onClick={() => { setMode(isSignup ? "login" : "signup"); setError(null); setNotice(null); }} className="mt-4 block text-sm text-clay underline">{isSignup ? "Already have an account? Log in" : "New here? Create an account"}</button>
    <Link href={recovery} className="mt-3 block text-sm text-ink/80 underline">Forgot password or need a confirmation email?</Link>
    <p className="mt-5 text-xs leading-relaxed text-ink/70">Read our <Link href="/terms" className="underline">service terms</Link> and <Link href="/privacy" className="underline">privacy information</Link> before creating an account. <Link href="/service-info#support" className="underline">Get account help</Link>.</p>
  </>;
}
