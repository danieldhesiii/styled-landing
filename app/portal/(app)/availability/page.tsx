"use client";

import { useEffect, useState } from "react";
import { vendorApi } from "@/lib/vendor-client";
import { calendarHealth } from "@/lib/calendar-health";
import { longDay } from "@/lib/admin-client";

interface Block {
  id: string;
  day: string;
  note: string | null;
  source: "manual" | "ical";
  liveOrders: number;
}
interface Ical {
  url: string | null;
  syncedAt: string | null;
}

export default function PortalAvailabilityPage() {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [ical, setIcal] = useState<Ical>({ url: null, syncedAt: null });
  const [icalInput, setIcalInput] = useState("");
  const [syncFailed, setSyncFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [icalBusy, setIcalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    setLoading(true);
    try {
      const r = await vendorApi("/api/vendor/availability");
      if (!r.ok) throw Error(r.data?.error ?? "Could not load availability.");
      setBlocks(r.data.blocks as Block[]);
      if (r.data.ical) setIcal(r.data.ical as Ical);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load availability. Please retry.");
    } finally { setLoading(false); }
  }

  // Keep network failures recoverable and always release busy controls.
  async function calendarAction(method: "PUT" | "POST" | "DELETE", body?: unknown) {
    setError(null);
    setNotice(null);
    setIcalBusy(true);
    try {
      const r = await vendorApi("/api/vendor/availability/ical", method, body);
      if (!r.ok) throw Error(r.data?.error ?? "Calendar update failed. Please retry.");
      setSyncFailed(false);
      return r;
    } catch (e) {
      setSyncFailed(method !== "DELETE");
      setError(e instanceof Error ? e.message : "Calendar update failed. Please retry.");
      return null;
    } finally {
      // A connection may have been saved even when its initial sync failed.
      await load();
      setIcalBusy(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function connectIcal(e: React.FormEvent) {
    e.preventDefault();
    const r = await calendarAction("PUT", { url: icalInput.trim() });
    if (!r) return;
    setNotice(`Calendar connected. ${r.data.blockedDays} busy days synced.`);
    setIcalInput("");
  }

  async function syncNow() {
    const r = await calendarAction("POST");
    if (r) setNotice(`Synced ${r.data.blockedDays} busy days from your calendar.`);
  }

  async function disconnectIcal() {
    const r = await calendarAction("DELETE");
    if (r) setNotice("Calendar disconnected. Its synced dates have been removed.");
  }

  async function block(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!day) return;
    setSaving(true);
    try {
      const r = await vendorApi("/api/vendor/availability", "POST", { day, note: note.trim() || undefined });
      if (!r.ok) throw Error(r.data?.error ?? "Could not block that date.");
      setNotice(r.data.liveOrders > 0
        ? `Date blocked. You already have ${r.data.liveOrders} existing orders on this date; blocking stops new requests and does not cancel them.`
        : "Date blocked. Couples can no longer request you then.");
      setDay("");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not block that date. Please retry.");
    } finally { setSaving(false); }
  }

  async function unblock(id: string) {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const r = await vendorApi(`/api/vendor/availability/${id}`, "DELETE");
      if (!r.ok) throw Error(r.data?.error ?? "Could not unblock that date.");
      setBlocks((prev) => (prev ?? []).filter((b) => b.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unblock that date. Please retry.");
    } finally { setSaving(false); }
  }

  const health = calendarHealth(!!ical.url, ical.syncedAt);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl text-ink">Availability</h1>
      <p className="mt-1 text-sm text-ink/50">
        Block dates you&apos;re already booked or away, so couples can&apos;t request you then. Other dates remain subject to stock, notice periods and your confirmation.
      </p>

      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error} {blocks !== null && "Previously loaded dates may be out of date."}<button type="button" disabled={loading} className="ml-3 underline" onClick={() => { setError(null); void load(); }}>Reload availability</button></p>}
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

      {/* Calendar sync */}
      <div className="mt-6 rounded-3xl border border-sand bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl text-ink">Sync your calendar</h2>
        <p className="mt-1 text-sm text-ink/50">
          Paste a read-only link (iCal / .ics) from Google Calendar, Booqable, Current RMS or similar, and the days you&apos;re
          busy there will block after a successful sync. Scheduled updates depend on the service being configured and running; use Sync now before relying on recent changes.
        </p>
        <p className="mt-2 text-xs text-ink/60">Sync blocks whole days. Repeating events are not expanded; review those dates manually. Manual blocks are preserved during sync.</p>
        {blocks === null ? <p role="status" className="mt-4 text-sm">{error ? "Calendar status unavailable. Reload availability to retry." : "Loading calendar status…"}</p> : ical.url ? (
          <div className="mt-4">
            <p className="truncate text-sm text-ink/70">Connected: <span className="font-mono text-xs">{ical.url}</span></p>
            <p role="status" className="mt-2 text-sm text-ink/70">
              {syncFailed ? "Latest manual sync failed. Retry, check the feed link, or use Block a date above." :
                health === "stale" ? "Calendar data is stale (48 hours or more). Sync now or block recent bookings manually." :
                health === "never_synced" ? "No successful sync recorded. Sync now before relying on this calendar." :
                "Calendar synced within the last 48 hours. New changes still need a sync."}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              Last successful sync: {ical.syncedAt ? new Date(ical.syncedAt).toLocaleString("en-GB") : "never recorded"}.
              Failure history is not stored; this time records successful syncs only.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={syncNow} disabled={icalBusy} className="rounded-full bg-ink px-4 py-2 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30">
                {icalBusy ? "Syncing…" : syncFailed ? "Retry sync" : "Sync now"}
              </button>
              <button type="button" onClick={disconnectIcal} disabled={icalBusy} className="rounded-full border border-sand px-4 py-2 text-sm text-ink/60 hover:border-red-300 hover:text-red-700 disabled:opacity-40">
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={connectIcal} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="ical-url" className="block text-sm font-medium text-ink">Calendar link</label>
              <input id="ical-url" type="url" required placeholder="https://…/basic.ics" value={icalInput} onChange={(e) => setIcalInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/30" />
            </div>
            <button type="submit" disabled={icalBusy || !icalInput.trim()} className="rounded-full bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90 disabled:bg-ink/30">
              {icalBusy ? "Connecting…" : "Connect & sync"}
            </button>
          </form>
        )}
      </div>

      <h2 className="mt-8 font-serif text-xl text-ink">Blocked dates</h2>
      {blocks === null ? (
        <p role="status" className="mt-2 text-sm text-ink/60">{error ? "Dates unavailable. Reload availability to retry." : "Loading blocked dates…"}</p>
      ) : blocks.length === 0 ? (
        <div className="mt-3 rounded-3xl border border-dashed border-sand px-6 py-12 text-center text-sm text-ink/50">
          No blocked dates recorded. Stock, notice periods and supplier confirmation still apply.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-sand overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  {longDay(b.day)}
                  {b.source === "ical" && (
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink/40">From calendar</span>
                  )}
                </p>
                {b.note && <p className="text-xs text-ink/50">{b.note}</p>}
                {b.liveOrders > 0 && (
                  <p className="text-xs text-clay">{b.liveOrders} existing order{b.liveOrders === 1 ? "" : "s"} on this day</p>
                )}
              </div>
              {b.source === "ical" ? (
                <span className="text-xs text-ink/30">auto</span>
              ) : (
                <button type="button" disabled={saving} onClick={() => unblock(b.id)}
                  className="rounded-full border border-sand px-3 py-1 text-xs text-ink/60 hover:border-clay/50 hover:text-ink">
                  Unblock
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-ink/40">
        Need to limit a single product on a date (rather than your whole business)? Ask the Styled team. They can set per-product limits.
      </p>
    </div>
  );
}
