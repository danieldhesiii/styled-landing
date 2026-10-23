"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { safeLocalRedirect } from "@/lib/auth/navigation";
import { authError } from "@/lib/auth/messages";
export default function ResetPasswordForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      // Revalidate even if the server rendered the form earlier.
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user || user.is_anonymous) { setError("Your session has expired. Request a fresh recovery email."); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(""); setConfirm(""); setDone(true);
      window.location.assign(safeLocalRedirect(next));
    } catch (err) { setError(authError(err instanceof Error ? err.message : "")); }
    finally { setBusy(false); }
  }
  if (done) return <><h1 className="font-serif text-3xl">Password updated</h1><p role="status" className="mt-4">Your new password is ready to use.</p><a href={safeLocalRedirect(next)} className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-cream">Continue to your account</a></>;
  return <><h1 className="font-serif text-3xl">Choose a new password</h1>
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label htmlFor="reset-password" className="block text-sm">New password (at least 6 characters)</label>
      <input id="reset-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-sand px-4 py-3 focus:ring-2 focus:ring-clay" />
      <label htmlFor="reset-confirm" className="block text-sm">Confirm new password</label>
      <input id="reset-confirm" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-xl border border-sand px-4 py-3 focus:ring-2 focus:ring-clay" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-full bg-ink px-6 py-3 text-cream disabled:opacity-50">{busy ? "Updating password…" : "Update password"}</button>
    </form><Link href={`/auth/recovery?${new URLSearchParams({ next: safeLocalRedirect(next) })}`} className="mt-5 block text-sm underline">Request a fresh recovery email</Link>
  </>;
}
