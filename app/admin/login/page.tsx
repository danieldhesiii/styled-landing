"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Staff sign-in. Accounts are created by a developer with `npm run staff:add`;
// there is no sign-up here.
export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("denied")) {
      setError("That account doesn't have staff access.");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setBusy(false);
      return setError("That email and password don't match.");
    }
    // A valid login isn't enough: it has to be a staff account.
    const me = await fetch("/api/admin/me", { cache: "no-store" });
    if (!me.ok) {
      await supabase.auth.signOut();
      setBusy(false);
      return setError("That account doesn't have staff access.");
    }
    window.location.assign("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-sand bg-white p-8 shadow-sm">
        <p className="font-serif text-2xl text-ink">
          Styled<span className="text-clay">.</span>
          <span className="ml-2 rounded-full bg-ink px-2 py-0.5 align-middle font-sans text-[10px] font-medium uppercase tracking-wider text-cream">Staff</span>
        </p>
        <h1 className="mt-6 font-serif text-3xl text-ink">Sign in</h1>
        <label htmlFor="email" className="mt-6 block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-sand bg-cream/50 px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
        />
        <label htmlFor="password" className="mt-4 block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-sand bg-cream/50 px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
        />
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-blush/30 px-4 py-3 text-sm text-ink/80">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="mt-6 w-full rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-xs text-ink/40">Staff accounts are set up by the Styled team.</p>
        <p className="mt-2 text-center text-xs">
          <a href="/" className="text-ink/50 hover:text-ink">← Back to the site</a>
        </p>
      </form>
    </div>
  );
}
