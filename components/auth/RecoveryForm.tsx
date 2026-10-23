"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authCallbackPath, safeLocalRedirect } from "@/lib/auth/navigation";
import { authError } from "@/lib/auth/messages";

export default function RecoveryForm({ next, invalidLink }: { next: string; invalidLink: boolean }) {
  const [email, setEmail] = useState("");
  const [action, setAction] = useState("reset");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const destination = safeLocalRedirect(next);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setNotice(null);
    try {
      const supabase = createClient();
      const callback = new URL(authCallbackPath(destination, action === "reset" || action === "email_change"), window.location.origin).href;
      const result = action === "reset"
        ? await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callback })
        : await supabase.auth.resend({ type: action === "email_change" ? "email_change" : "signup", email: email.trim(), options: { emailRedirectTo: callback } });
      if (result.error) throw result.error;
      setNotice("If that address is eligible, an email will arrive with the next step. Check your spam folder too. Open the latest link in this same browser; links expire and can only be used once.");
    } catch (err) { setError(authError(err instanceof Error ? err.message : "")); }
    finally { setBusy(false); }
  }
  return <>
    <h1 className="font-serif text-3xl text-ink">Recover account access</h1>
    {invalidLink && <p role="alert" className="mt-4 text-sm text-ink/80">That link could not be used. It may have expired, already been opened, or been opened in a different browser. Request a fresh email below.</p>}
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label htmlFor="recovery-email" className="block text-sm text-ink">Account email</label>
      <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-sand px-4 py-3 focus:ring-2 focus:ring-clay" />
      <label htmlFor="recovery-action" className="block text-sm text-ink">What do you need?</label>
      <select id="recovery-action" value={action} onChange={e => { setAction(e.target.value); setNotice(null); setError(null); }} className="w-full rounded-xl border border-sand bg-white px-3 py-3 text-sm">
        <option value="reset">Reset my password</option>
        <option value="signup">Resend account confirmation</option>
        <option value="email_change">Resend guest upgrade / email change confirmation</option>
      </select>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-ink/80">{notice}</p>}
      <button disabled={busy} className="w-full rounded-full bg-ink px-5 py-3 text-cream disabled:opacity-50">{busy ? "Requesting email…" : "Send email"}</button>
    </form>
    <Link href={destination.startsWith("/portal") ? "/portal/login" : `/login?${new URLSearchParams({ mode: "login", next: destination })}`} className="mt-5 block text-sm underline">Back to log in</Link>
    <p className="mt-4 text-sm text-ink/70">Still stuck? <Link href="/service-info#support" className="underline">Contact support</Link>. Never send your password or email sign-in link.</p>
  </>;
}
