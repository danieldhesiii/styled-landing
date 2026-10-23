"use client";
import { useEffect, useState } from "react";
import HelpButton from "@/components/help/HelpButton";
import OrderStatusCard, {
  type OrderView,
} from "@/components/order/OrderStatusCard";
export default function MyOrders({ onBrowse }: { onBrowse: () => void }) {
  const [orders, setOrders] = useState<OrderView[] | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOrders(null);
    setError("");
    fetch("/api/orders", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.ok)
          throw Error("Could not load your orders. Please try again.");
        setOrders(d.orders);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [retry]);
  return (
    <section className="rounded-2xl border border-sand bg-white p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">
            Submitted to Styled
          </p>
          <h1 className="mt-3 font-serif text-4xl">My orders</h1>
        </div>
        <HelpButton topic="orders" />
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
        These are requests you have submitted and bookings confirmed by Styled.
        We check products, delivery and wedding dates with suppliers manually
        before confirming. Your basket is a separate collection of choices you
        have not submitted.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setRetry((n) => n + 1)}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Refresh updates
        </button>
        <button
          type="button"
          onClick={onBrowse}
          className="rounded-full border border-sand px-4 py-2 text-sm"
        >
          Browse catalogue
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-cream p-5 text-sm">
          {error}
        </p>
      )}
      {!orders && !error && (
        <p role="status" className="mt-6 text-sm text-ink/60">
          Loading your requests…
        </p>
      )}
      {orders?.length === 0 && !error && (
        <div className="mt-7 rounded-xl bg-cream p-7">
          <h2 className="font-serif text-2xl">No requests submitted yet</h2>
          <p className="mt-3 text-sm text-ink/60">
            Collect pieces in your basket, then choose Request supplier
            confirmation when you’re ready. Nothing is booked or charged by
            adding products to the basket.
          </p>
        </div>
      )}
      <div className="mt-7 space-y-6">
        {orders?.map((o) => (
          <OrderStatusCard key={o.id} order={o} />
        ))}
      </div>
    </section>
  );
}
