"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import OnboardingChecklist from "@/components/vendor/OnboardingChecklist";
import { vendorApi } from "@/lib/vendor-client";
export default function SupplierHome() {
  const [counts, setCounts] = useState<{
      pending: number;
      upcoming: number;
    } | null>(null),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      const r = await vendorApi("/api/vendor/orders");
      if (!r.ok) throw Error(r.data?.error || "Could not load requests.");
      const orders = r.data.orders;
      setCounts({
        pending: orders.filter(
          (o: any) =>
            o.actionable && o.outstandingTasks.length > 0,
        ).length,
        upcoming: orders.filter((o: any) =>
          ["confirmed", "deposit_paid"].includes(o.status),
        ).length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load requests.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-widest text-clay">
        Supplier workspace
      </p>
      <h1 className="mt-3 font-serif text-4xl">Your business, at a glance</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
        Manage your catalogue and respond to requests here. Your personal
        wedding plans and venue workspace are separate.
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Link
          href="/portal/requests"
          className="rounded-2xl bg-ink p-6 text-cream"
        >
          <span className="text-sm text-cream/70">
            Requests needing a response
          </span>
          <strong className="mt-2 block font-serif text-4xl">
            {counts ? counts.pending : "…"}
          </strong>
          <span className="mt-4 block text-sm">Review requests →</span>
        </Link>
        <Link
          href="/portal/products"
          className="rounded-2xl border border-sand bg-white p-6"
        >
          <span className="font-serif text-2xl">Your catalogue</span>
          <p className="mt-2 text-sm text-ink/65">
            Add products or update photos, prices and quantities.
          </p>
          <span className="mt-4 block text-sm underline">
            Manage products →
          </span>
        </Link>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm">
          {error}{" "}
          <button className="min-h-11 underline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      <OnboardingChecklist />
      <aside className="mt-7 rounded-xl bg-sage/10 p-5 text-sm leading-relaxed">
        <h2 className="font-medium">How requests become bookings</h2>
        <p className="mt-2 text-ink/70">
          Check your items and the full hire dates, then tell Styled what you
          can supply. Confirming availability here does not confirm the whole
          customer booking. Styled coordinates the final quote and agreement.
        </p>
        <p className="mt-2 text-ink/70">
          Check Requests regularly. Email alerts depend on the service’s sending
          setup.
        </p>
      </aside>
    </>
  );
}
