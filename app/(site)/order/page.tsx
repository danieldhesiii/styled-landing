"use client";

import { useEffect, useState } from "react";
import OrderStatusCard, { type OrderView } from "@/components/order/OrderStatusCard";

// Track an order. Couples who ordered in this browser see their orders straight
// away; anyone else can look one up with their reference and email.
export default function OrderPage() {
  const [mine, setMine] = useState<OrderView[] | null>(null);
  const [found, setFound] = useState<OrderView | null>(null);
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setReference(ref.toUpperCase());
    fetch("/api/orders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => setMine(d.orders ?? []))
      .catch(() => setMine([]));
  }, []);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFound(null);
    setBusy(true);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      });
      const data = await res.json();
      if (res.ok && data?.order) setFound(data.order);
      else setError(data?.error ?? "We couldn't find an order with those details.");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const hasMine = (mine?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">Track your order</h1>
      <p className="mt-3 text-ink/60">
        See which suppliers have confirmed your date, and read any message from your stylist.
      </p>

      {mine === null && <p className="mt-10 text-sm text-ink/40">Loading…</p>}

      {hasMine && (
        <section className="mt-10 space-y-6" aria-label="Your orders">
          {mine!.map((o) => (
            <OrderStatusCard key={o.id} order={o} />
          ))}
        </section>
      )}

      {mine !== null && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-ink">{hasMine ? "Find a different order" : "Find your order"}</h2>
          <p className="mt-1 text-sm text-ink/50">
            Use the reference from your confirmation (it looks like STY-1A2B3C4D) and the email you ordered with.
          </p>
          <form onSubmit={lookup} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="STY-1A2B3C4D"
              aria-label="Order reference"
              className="rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              aria-label="Email used for the order"
              className="rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <button
              type="submit"
              disabled={busy || !reference.trim() || !email.trim()}
              className="rounded-full bg-ink px-6 py-2.5 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30"
            >
              {busy ? "Looking…" : "Find order"}
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-blush/30 px-4 py-3 text-sm text-ink/80">
              {error}
            </p>
          )}
          {found && (
            <div className="mt-6">
              <OrderStatusCard order={found} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
