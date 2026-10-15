"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CtaEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      router.push("/design");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/email-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok && data?.error) {
        setError(data.error);
        setBusy(false);
        return;
      }
    } catch {
      // Non-critical — still let the user through.
    }

    router.push("/design");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-full border border-sand bg-white px-5 py-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/40"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-ink px-6 py-3 text-center text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "…" : "Get started free"}
      </button>
      {error && (
        <p className="w-full text-center text-sm text-red-500">{error}</p>
      )}
    </form>
  );
}
