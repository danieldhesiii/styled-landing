"use client";
import { useCallback, useEffect, useState } from "react";
import BookingOperations from "@/components/booking/BookingOperations";
import { vendorApi } from "@/lib/vendor-client";

type Notice = { id: string; order_id: string; reference: string; summary: string; status: string; version: string };
export default function SupplierOrderInbox() {
  const [orders, setOrders] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await vendorApi("/api/vendor/order-inbox");
      if (!r.ok) throw Error();
      setOrders(r.data.notices);
      setError("");
    } catch { setError("Order messages could not be refreshed."); }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    const timer = window.setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  async function approve(n: Notice) {
    setBusy(n.id);
    try {
      const r = await vendorApi("/api/vendor/order-inbox", "POST", { id: n.id, version: n.version });
      await load();
      if (!r.ok) setError(r.data.error || "Please review the order again.");
    } catch { setError("Check the current status before trying again."); }
    finally { setBusy(""); }
  }
  return <section aria-label="Order messages" className="mb-8 rounded-xl border border-sand bg-white p-5">
    <h2 className="font-serif text-2xl">Order messages</h2>
    {error && <p role="alert">{error}</p>}
    {!orders.length && !error && <p className="mt-2 text-sm text-ink/65">New customer orders will appear here.</p>}
    {orders.map(n => <details key={n.id} className="mt-3 border-t border-sand pt-3">
      <summary className="cursor-pointer">{n.reference} · {n.status.replaceAll("_", " ")}</summary>
      <p className="my-3 whitespace-pre-line break-words text-sm">{n.summary}</p>
      {n.status === "awaiting_approval" && <button disabled={!!busy} onClick={() => approve(n)} className="min-h-11 rounded-full bg-ink px-5 text-sm text-cream">{busy === n.id ? "Saving…" : "Confirm item availability"}</button>}
      {["availability_confirmed", "confirmed", "deposit_paid", "needs_review"].includes(n.status) &&
        <BookingOperations orderId={n.order_id} role="supplier" onSaved={() => void load()}/>}
    </details>)}
  </section>;
}
