"use client";

import { useEffect, useState } from "react";
import { vendorApi } from "@/lib/vendor-client";
import { longDay } from "@/lib/admin-client";

interface Block {
  id: string;
  day: string;
  note: string | null;
  liveOrders: number;
}

export default function PortalAvailabilityPage() {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  function load() {
    vendorApi("/api/vendor/availability").then((r) => {
      if (!r.ok) return setError(r.data?.error ?? "Couldn't load your blocked dates.");
      setBlocks(r.data.blocks as Block[]);
    });
  }
  useEffect(() => { load(); }, []);

  async function block(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!day) return;
    setSaving(true);
    const r = await vendorApi("/api/vendor/availability", "POST", { day, note: note.trim() || undefined });
    setSaving(false);
    if (!r.ok) return setError(r.data?.error ?? "Couldn't block that date.");
    if (r.data.liveOrders > 0) {
      setNotice(`Date blocked. Heads up: you already have ${r.data.liveOrders} order${r.data.liveOrders === 1 ? "" : "s"} on that day — blocking won't cancel them, it just stops new requests.`);
    } else {
      setNotice("Date blocked — couples can no longer request you then.");
    }
    setDay("");
    setNote("");
    load();
  }

  async function unblock(id: string) {
    setError(null);
    setNotice(null);
    const r = await vendorApi(`/api/vendor/availability/${id}`, "DELETE");
    if (!r.ok) return setError(r.data?.error ?? "Couldn't unblock that date.");
    setBlocks((prev) => (prev ?? []).filter((b) => b.id !== id));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl text-ink">Availability</h1>
      <p className="mt-1 text-sm text-ink/50">
        Block dates you&apos;re already booked or away, so couples can&apos;t request you then. Everything else stays bookable.
      </p>

      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p className="mt-6 rounded-xl bg-sage/15 px-4 py-3 text-sm text-ink/80">{notice}</p>}

      <form onSubmit={block} className="mt-6 flex flex-wrap items-end gap-3 rounded-3xl border border-sand bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="block-day" className="block text-sm font-medium text-ink">Block a date</label>
          <input id="block-day" type="date" required min={today} value={day} onChange={(e) => setDay(e.target.value)}
            className="mt-1.5 rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="block-note" className="block text-sm font-medium text-ink">Note <span className="text-ink/40">(optional)</span></label>
          <input id="block-note" maxLength={300} placeholder="e.g. booked elsewhere" value={note} onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30" />
        </div>
        <button type="submit" disabled={saving || !day} className="rounded-full bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30">
          {saving ? "Blocking…" : "Block date"}
        </button>
      </form>

      <h2 className="mt-8 font-serif text-xl text-ink">Blocked dates</h2>
      {blocks === null ? (
        <p className="mt-2 text-sm text-ink/40">Loading…</p>
      ) : blocks.length === 0 ? (
        <div className="mt-3 rounded-3xl border border-dashed border-sand px-6 py-12 text-center text-sm text-ink/50">
          No blocked dates. Every upcoming day is bookable.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-sand overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{longDay(b.day)}</p>
                {b.note && <p className="text-xs text-ink/50">{b.note}</p>}
                {b.liveOrders > 0 && (
                  <p className="text-xs text-clay">{b.liveOrders} existing order{b.liveOrders === 1 ? "" : "s"} on this day</p>
                )}
              </div>
              <button type="button" onClick={() => unblock(b.id)}
                className="rounded-full border border-sand px-3 py-1 text-xs text-ink/60 hover:border-clay/50 hover:text-ink">
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-ink/40">
        Need to limit a single product on a date (rather than your whole business)? Ask the Styled team — they can set per-product limits.
      </p>
    </div>
  );
}
