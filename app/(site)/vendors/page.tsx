"use client";

import { useState } from "react";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";

// "List your business" — suppliers apply to join the Styled marketplace. Posts to
// /api/vendor-applications; the Styled team reviews it in the admin area.
const FIELD =
  "mt-2 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30";
const LABEL = "block text-sm font-medium text-ink";

export default function VendorsPage() {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/vendor-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setDone(json?.message ?? "Thanks — your application is in. We'll be in touch soon.");
        form.reset();
      } else {
        setError(json?.error ?? "Couldn't send your application. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-4 font-serif text-4xl text-ink">Application received</h1>
        <p className="mt-3 text-ink/60">{done}</p>
        <a href="/" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90">
          Back to the site
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">List your business on Styled</h1>
      <p className="mt-3 text-ink/60">
        Couples design their whole wedding with your pieces, then order them delivered to the venue. Tell us a
        little about what you offer and we'll get you set up.
      </p>

      <form onSubmit={submit} className="mt-10 grid gap-5">
        {/* Honeypot — hidden from people, tempting to bots. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <div>
          <label htmlFor="businessName" className={LABEL}>Business name</label>
          <input id="businessName" name="businessName" required maxLength={120} className={FIELD} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contactName" className={LABEL}>Your name</label>
            <input id="contactName" name="contactName" maxLength={120} className={FIELD} />
          </div>
          <div>
            <label htmlFor="email" className={LABEL}>Email</label>
            <input id="email" name="email" type="email" required maxLength={160} autoComplete="email" className={FIELD} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className={LABEL}>Phone <span className="text-ink/40">(optional)</span></label>
            <input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" className={FIELD} />
          </div>
          <div>
            <label htmlFor="category" className={LABEL}>What do you offer?</label>
            <select id="category" name="category" defaultValue="" className={FIELD}>
              <option value="" disabled>Choose a category…</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="area" className={LABEL}>Area you cover <span className="text-ink/40">(optional)</span></label>
            <input id="area" name="area" maxLength={120} placeholder="e.g. London & Essex" className={FIELD} />
          </div>
          <div>
            <label htmlFor="website" className={LABEL}>Website or Instagram <span className="text-ink/40">(optional)</span></label>
            <input id="website" name="website" maxLength={200} placeholder="https://" className={FIELD} />
          </div>
        </div>

        <div>
          <label htmlFor="message" className={LABEL}>Anything else? <span className="text-ink/40">(optional)</span></label>
          <textarea id="message" name="message" rows={4} maxLength={2000} className={FIELD} />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-blush/30 px-4 py-3 text-sm text-ink/80">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream hover:bg-ink/90 disabled:bg-ink/30 sm:w-auto sm:self-start sm:px-10"
        >
          {busy ? "Sending…" : "Apply to join"}
        </button>
      </form>
    </div>
  );
}
