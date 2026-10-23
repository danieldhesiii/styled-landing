"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authError } from "@/lib/auth/messages";
import { supplierAccessStatus } from "@/lib/auth/navigation";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  async function checkAccess() {
    const response = await fetch("/auth/supplier-access", { cache: "no-store" });
    const status = supplierAccessStatus(response.status);
    if (status === "allowed") { window.location.assign("/portal"); return; }
    if (status === "signed-out") { setSignedIn(false); setError("Your session could not be verified. Please log in again or recover access below."); }
    else if (status === "denied") setError("You are signed in, but this account does not have supplier workspace access. Ask Styled to check the email linked to your supplier.");
    else setError("You are signed in, but supplier access could not be checked right now. Please retry; your session has been kept.");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      setSignedIn(true); setPassword("");
      try { await checkAccess(); }
      catch { setError("You are signed in, but supplier access is temporarily unavailable. Please retry; your session has been kept."); }
    } catch (err) { setError(authError(err instanceof Error ? err.message : "")); }
    finally { setBusy(false); }
  }
  async function retry() {
    setBusy(true); setError(null);
    try { await checkAccess(); }
    catch { setError("Supplier access is temporarily unavailable. Please retry; your session has been kept."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-5 py-12">
    <div className="w-full max-w-sm rounded-3xl border border-sand bg-white p-8 shadow-sm">
      <Link href="/" className="font-serif text-2xl">Styled. <span className="font-sans text-sm">Supplier</span></Link>
      <h1 className="mt-6 font-serif text-3xl">Supplier log in</h1>
      <p className="mt-2 text-sm text-ink/70">Accounts are linked to suppliers by the Styled team.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label htmlFor="supplier-email" className="block text-sm">Email</label>
        <input id="supplier-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-sand px-4 py-3 focus:ring-2 focus:ring-clay" />
        <label htmlFor="supplier-password" className="block text-sm">Password</label>
        <input id="supplier-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-sand px-4 py-3 focus:ring-2 focus:ring-clay" />
        <button disabled={busy} className="w-full rounded-full bg-ink px-6 py-3 text-cream disabled:opacity-50">{busy ? "Checking access…" : "Log in"}</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-ink/80">{error}</p>}
      {signedIn && <button type="button" disabled={busy} onClick={retry} className="mt-4 text-sm underline">Retry supplier access check</button>}
      <Link href="/auth/recovery?next=%2Fportal" className="mt-5 block text-sm underline">Forgot password or need a confirmation email?</Link>
      <Link href="/service-info#support" className="mt-3 block text-sm underline">Get help with supplier access</Link>
      <Link href="/design" className="mt-3 block text-sm underline">Continue to your customer account</Link>
    </div>
  </main>;
}
