"use client";

import { useEffect, useState } from "react";
import OrderStatusCard, { type OrderView } from "@/components/order/OrderStatusCard";

// A signed-in couple's own orders, newest first. Pulls GET /api/orders (scoped to
// the user by row level security) and reuses the order status card from /order.
export default function MyOrdersDrawer({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error();
        if (!cancelled) setOrders(data.orders as OrderView[]);
      } catch {
        if (!cancelled) setError("Couldn't load your orders. Please try again.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-sand px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-ink">My orders</h2>
            <p className="mt-0.5 text-xs text-ink/50">
              {orders ? (orders.length === 0 ? "No orders yet" : `${orders.length} order${orders.length > 1 ? "s" : ""}`) : "Loading…"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/40 hover:border-clay hover:text-ink transition-colors">
            ×
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {error && <p className="rounded-xl bg-blush/30 px-4 py-3 text-sm text-ink/80">{error}</p>}
          {orders && orders.length === 0 && !error && (
            <div className="flex flex-col items-center gap-3 pt-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-clay/40 text-2xl text-clay/50">🧾</div>
              <p className="max-w-xs text-sm text-ink/50">
                When you reserve a design, your orders appear here so you can track where each one is up to.
              </p>
            </div>
          )}
          {orders?.map((o) => (
            <OrderStatusCard key={o.id} order={o} />
          ))}
        </div>

        <div className="border-t border-sand px-6 py-4">
          <button type="button" onClick={onClose}
            className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 transition-colors">
            Done
          </button>
        </div>
      </aside>
    </>
  );
}
