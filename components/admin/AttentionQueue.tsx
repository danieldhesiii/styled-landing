"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-client";
import type { AttentionItem, AttentionKind } from "@/lib/staff-attention";

const LABELS: Record<AttentionKind, string> = {
  application: "Applications", venue_draft: "Venue drafts", supplier_reply: "Supplier replies", calendar: "Calendar sync",
};
interface Queue { items: AttentionItem[]; checkedAt: string; truncatedSources: string[]; sourceLimit: number }
const time = (iso: string) => new Date(iso).toLocaleString("en-GB");
export default function AttentionQueue() {
  const [data, setData] = useState<Queue | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<AttentionKind | "all">("all");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const r = await adminApi("/api/admin/attention");
      if (!r.ok) throw Error(r.data?.error || "Could not load the attention queue.");
      setData(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the attention queue.");
    } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const items = data?.items.filter((item) => kind === "all" || item.kind === kind) ?? [];
  return (
    <section aria-labelledby="attention-heading" aria-busy={busy} className="mb-10 rounded-2xl border border-sand bg-cream p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="attention-heading" className="font-serif text-3xl">Daily attention</h2>
        <button type="button" disabled={busy} onClick={() => void load()} className="rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50">{busy ? "Checking…" : error ? "Retry queue" : "Refresh queue"}</button>
      </div>
      <p className="mt-2 text-sm text-ink/70">Review applications and venue drafts, follow up supplier replies and check calendar freshness. Reply and sync flags use 48 hours as an attention threshold, not a promised response or sync schedule.</p>
      <p className="mt-2 text-xs text-ink/60">Reply age starts when the item was requested; reminders do not reset that clock. Calendar flags cover active suppliers with a connected feed; failures are not stored separately.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error} {data && "The queue below is from the previous check."}</p>}
      {!data && !error && <p role="status" className="mt-4 text-sm">Loading the attention queue…</p>}
      {data && <>
        <p className="mt-3 text-xs text-ink/60">Last checked: <time dateTime={data.checkedAt}>{time(data.checkedAt)}</time>. Refresh to check for changes.</p>
        {data.truncatedSources.length > 0 && <p role="status" className="mt-2 text-sm text-clay">Showing the oldest {data.sourceLimit} source records per category. More records are available in the linked management screens; counts below cover this sample.</p>}
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter attention queue">
          {(["all", ...Object.keys(LABELS)] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value as AttentionKind | "all")}
            className={`rounded-full px-3 py-2 text-sm ${kind === value ? "bg-ink text-cream" : "border border-sand"}`}>
            {value === "all" ? "All" : LABELS[value as AttentionKind]} ({data.items.filter((i) => value === "all" || i.kind === value).length})
          </button>)}
        </div>
        {items.length === 0 ? <p role="status" className="mt-4 text-sm">{kind === "all" ? "No items need attention in the checked records." : "No items in this category in the checked records."}</p> :
          <ul className="mt-4 divide-y divide-sand">
            {items.map((item) => <li key={item.id} className="py-4 text-sm">
              <p className="text-xs text-ink/60">{LABELS[item.kind]}</p>
              <h3 className="mt-1 font-medium">{item.title}</h3>
              <p className="mt-1 text-ink/70">{item.detail}</p>
              <p className="mt-1">Next: {item.nextActor}</p>
              <p className="mt-1 text-xs text-ink/60">{item.timestampLabel}: {item.timestamp ? <time dateTime={item.timestamp}>{time(item.timestamp)}</time> : "not recorded"}</p>
              <Link className="mt-2 inline-block underline" href={item.href}>{item.action}</Link>
            </li>)}
          </ul>}
      </>}
    </section>
  );
}
