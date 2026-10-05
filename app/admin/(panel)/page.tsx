"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import StatusPill from "@/components/admin/StatusPill";
import { adminApi, ago, daysUntil, longDay, money, ORDER_STATUS_LABEL } from "@/lib/admin-client";

interface InboxOrder {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  coupleName: string;
  email: string;
  weddingDate: string | null;
  venueLabel: string | null;
  guestCount: number | null;
  subtotalPence: number;
  depositPence: number;
  lines: { total: number; confirmed: number; declined: number; pending: number };
  suppliers: string[];
}

const TABS = ["requested", "confirmed", "declined", "cancelled", "all"] as const;

export default function InboxPage() {
  const [status, setStatus] = useState<(typeof TABS)[number]>("requested");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<InboxOrder[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Wait for typing to pause before searching.
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ status });
    if (search) params.set("q", search);
    const r = await adminApi(`/api/admin/orders?${params}`);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't load orders.");
    setError(null);
    setOrders(r.data.orders);
    setCounts(r.data.counts);
  }, [status, search]);

  useEffect(() => {
    load();
    // New orders arrive while the page is open: refresh quietly every 30 seconds.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-ink">Orders</h1>
          <p className="mt-1 text-sm text-ink/50">
            {counts.requested
              ? `${counts.requested} waiting for a stylist`
              : "Nothing is waiting. New orders appear here."}
          </p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email or reference"
          aria-label="Search orders"
          className="w-full rounded-full border border-sand bg-white px-5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30 sm:w-80"
        />
      </div>

      <div role="tablist" aria-label="Order status" className="mt-6 flex flex-wrap gap-2 border-b border-sand pb-4">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={status === t}
            onClick={() => {
              setOrders(null);
              setStatus(t);
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
              status === t ? "bg-ink text-cream" : "text-ink/60 hover:bg-sand/60 hover:text-ink"
            }`}
          >
            {t === "all" ? "All" : ORDER_STATUS_LABEL[t]}
            <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${status === t ? "bg-cream/20" : "bg-ink/5"}`}>
              {counts[t] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {orders === null && !error && <p className="mt-10 text-sm text-ink/40">Loading orders…</p>}

      {orders && orders.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-sand px-6 py-14 text-center text-sm text-ink/50">
          {search ? `No orders match “${search}”.` : "No orders here."}
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="mt-4 divide-y divide-sand overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
          {orders.map((o) => {
            const away = daysUntil(o.weddingDate);
            const waitedDays = (Date.now() - new Date(o.createdAt).getTime()) / 864e5;
            return (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="grid gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-cream/60 md:grid-cols-[1.4fr_1.2fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{o.coupleName}</p>
                    <p className="truncate text-xs text-ink/45">
                      <span className="font-mono">{o.reference}</span> · {o.email}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-ink">{longDay(o.weddingDate)}</p>
                    <p className="text-xs text-ink/45">
                      {away !== null ? (away >= 0 ? `in ${away} days` : "date has passed") : "ask the couple for a date"}
                      {o.venueLabel ? ` · ${o.venueLabel}` : ""}
                    </p>
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                        <div className="h-full bg-sage" style={{ width: `${o.lines.total ? (o.lines.confirmed / o.lines.total) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-ink/60">
                        {o.lines.confirmed}/{o.lines.total} confirmed
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink/45">
                      {o.lines.declined > 0 && <span className="mr-1 text-red-700">{o.lines.declined} declined ·</span>}
                      {o.suppliers.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 md:justify-end">
                    <div className="text-right">
                      <p className="font-serif text-lg text-ink">{money(o.subtotalPence)}</p>
                      <p className={`text-xs ${o.status === "requested" && waitedDays >= 1 ? "font-medium text-clay" : "text-ink/45"}`}>
                        {o.status === "requested" ? `waiting ${ago(o.createdAt).replace(" ago", "")}` : ago(o.createdAt)}
                      </p>
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
