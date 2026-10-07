"use client";

import { useEffect, useState } from "react";
import { adminApi, ago, shortDay } from "@/lib/admin-client";

interface Account {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  savedLooks: number;
  orders: number;
  renders: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminApi("/api/admin/accounts").then((r) => {
      if (!r.ok) return setError(r.data?.error ?? "Couldn't load accounts.");
      setAccounts(r.data.accounts as Account[]);
    });
  }, []);

  const filtered = (accounts ?? []).filter((a) =>
    q.trim() ? a.email.toLowerCase().includes(q.trim().toLowerCase()) : true
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-ink">Customers</h1>
          <p className="mt-1 text-sm text-ink/50">
            {accounts === null
              ? "Loading…"
              : accounts.length === 0
                ? "No couples have created an account yet."
                : `${accounts.length} ${accounts.length === 1 ? "couple" : "couples"} with an account`}
          </p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email"
          aria-label="Search customers"
          className="w-full rounded-full border border-sand bg-white px-5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30 sm:w-72"
        />
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {accounts && accounts.length === 0 && !error && (
        <div className="mt-10 rounded-3xl border border-dashed border-sand px-6 py-14 text-center text-sm text-ink/50">
          When couples sign up in the studio, they'll appear here with their saved looks and orders.
        </div>
      )}

      {accounts && accounts.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left text-xs uppercase tracking-wider text-ink/40">
                <th className="px-5 py-3 font-medium">Couple</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Last seen</th>
                <th className="px-5 py-3 text-right font-medium">Saved</th>
                <th className="px-5 py-3 text-right font-medium">Renders</th>
                <th className="px-5 py-3 text-right font-medium">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {filtered.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-cream/60">
                  <td className="px-5 py-3 font-medium text-ink">{a.email}</td>
                  <td className="px-5 py-3 text-ink/60">{shortDay(a.createdAt.slice(0, 10))}</td>
                  <td className="px-5 py-3 text-ink/60">{a.lastSignInAt ? ago(a.lastSignInAt) : "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink/70">{a.savedLooks}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink/70">{a.renders}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink/70">{a.orders}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink/40">
                    No couples match “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
