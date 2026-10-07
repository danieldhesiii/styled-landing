"use client";

import { useEffect, useState } from "react";
import { vendorApi } from "@/lib/vendor-client";
import { longDay } from "@/lib/admin-client";

interface Line {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  status: "pending" | "confirmed" | "declined";
  note: string | null;
}
interface Order {
  orderId: string;
  reference: string;
  status: string;
  weddingDate: string | null;
  venue: string | null;
  actionable: boolean;
  lines: Line[];
}

const LINE_STYLE: Record<Line["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sage/20 text-green-800",
  declined: "bg-ink/10 text-ink/50",
};

export default function PortalOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState<string | null>(null);

  function load() {
    vendorApi("/api/vendor/orders").then((r) => {
      if (!r.ok) return setError(r.data?.error ?? "Couldn't load your orders.");
      setOrders(r.data.orders as Order[]);
    });
  }
  useEffect(() => { load(); }, []);

  async function decide(order: Order, lineIds: string[], status: "confirmed" | "declined") {
    if (lineIds.length === 0) return;
    setSavingOrder(order.orderId);
    setError(null);
    const r = await vendorApi(`/api/vendor/orders/${order.orderId}/lines`, "PATCH", { lineIds, supplierStatus: status });
    setSavingOrder(null);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't update those items.");
    load();
  }

  const pendingCount = (orders ?? []).reduce(
    (n, o) => n + (o.actionable ? o.lines.filter((l) => l.status === "pending").length : 0), 0
  );

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Orders</h1>
      <p className="mt-1 text-sm text-ink/50">
        {orders === null
          ? "Loading…"
          : orders.length === 0
            ? "No orders include your products yet."
            : pendingCount > 0
              ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} waiting for your confirmation`
              : "You're all caught up."}
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {orders && orders.length === 0 && !error && (
        <div className="mt-10 rounded-3xl border border-dashed border-sand px-6 py-14 text-center text-sm text-ink/50">
          When a couple orders one of your pieces, it will appear here for you to confirm.
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => {
            const pending = o.lines.filter((l) => l.status === "pending").map((l) => l.id);
            return (
              <li key={o.orderId} className="rounded-3xl border border-sand bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-xl text-ink">{o.reference}</h2>
                    <p className="mt-1 text-sm text-ink/60">
                      {longDay(o.weddingDate)}{o.venue ? ` · ${o.venue}` : ""}
                    </p>
                  </div>
                  {o.actionable && pending.length > 0 && (
                    <button
                      type="button"
                      disabled={savingOrder === o.orderId}
                      onClick={() => decide(o, pending, "confirmed")}
                      className="rounded-full bg-ink px-4 py-1.5 text-sm text-cream hover:bg-ink/90 disabled:opacity-40"
                    >
                      Confirm all ({pending.length})
                    </button>
                  )}
                </div>

                <ul className="mt-4 divide-y divide-sand">
                  {o.lines.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{l.name}</p>
                        <p className="text-xs text-ink/50">{l.quantity}{l.unit ? ` · ${l.unit}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${LINE_STYLE[l.status]}`}>
                          {l.status}
                        </span>
                        {o.actionable && l.status !== "confirmed" && (
                          <button type="button" disabled={savingOrder === o.orderId} onClick={() => decide(o, [l.id], "confirmed")}
                            className="rounded-full border border-sand px-3 py-1 text-xs text-ink/70 hover:border-clay/50 hover:text-ink disabled:opacity-40">
                            Confirm
                          </button>
                        )}
                        {o.actionable && l.status !== "declined" && (
                          <button type="button" disabled={savingOrder === o.orderId} onClick={() => decide(o, [l.id], "declined")}
                            className="rounded-full border border-sand px-3 py-1 text-xs text-ink/60 hover:border-red-300 hover:text-red-700 disabled:opacity-40">
                            Decline
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {!o.actionable && (
                  <p className="mt-3 text-xs text-ink/40">
                    This order is {o.status.replace("_", " ")} — no further action needed.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
