import type { SupabaseClient } from "@supabase/supabase-js";
import { todayUtc } from "@/lib/availability";

// Minimal iCalendar (.ics) handling for supplier calendar sync.
//
// We only need one thing from a feed: which future days is the supplier busy? So
// we read each VEVENT's start/end date and mark those days blocked. This covers
// the common Google Calendar / Booqable / Current RMS exports (all-day and timed
// events). Recurring events (RRULE) are not expanded — only their first
// occurrence is counted; the supplier's confirm step is the backstop, and they
// can always block a date by hand. Timezones are reduced to the calendar date,
// which is all that matters for blocking whole days.

const MAX_BYTES = 2 * 1024 * 1024; // don't ingest huge feeds
const HORIZON_DAYS = 550; // ~18 months of weddings ahead

// Unfold RFC 5545 line folding (continuation lines start with space or tab).
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// "20270618" or "20270618T130000Z" → "2027-06-18"
function dateOf(value: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}

// The set of future YYYY-MM-DD dates the feed marks busy (within the horizon).
export function parseBusyDates(ics: string): Set<string> {
  const lines = unfold(ics);
  const today = todayUtc();
  const limit = addDays(today, HORIZON_DAYS);
  const busy = new Set<string>();

  let inEvent = false;
  let start: string | null = null;
  let end: string | null = null;
  let allDay = false;
  let cancelled = false;

  const flush = () => {
    if (start && !cancelled) {
      // All-day DTEND is exclusive; timed/no-end spans through the end date.
      const last = end ? (allDay ? addDays(end, -1) : end) : start;
      for (let d = start; d <= last; d = addDays(d, 1)) {
        if (d >= today && d <= limit) busy.add(d);
        if (d > limit) break;
      }
    }
    start = end = null;
    allDay = cancelled = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { inEvent = true; start = end = null; allDay = cancelled = false; continue; }
    if (line === "END:VEVENT") { flush(); inEvent = false; continue; }
    if (!inEvent) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const left = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const name = left.split(";")[0].toUpperCase();

    if (name === "DTSTART") { start = dateOf(value); if (/VALUE=DATE(?!-TIME)/i.test(left) || /^\d{8}$/.test(value)) allDay = true; }
    else if (name === "DTEND") { end = dateOf(value); }
    else if (name === "STATUS" && value.toUpperCase() === "CANCELLED") { cancelled = true; }
  }

  return busy;
}

export interface SyncResult {
  ok: boolean;
  blockedDays?: number;
  error?: string;
}

// Fetch a supplier's feed and reconcile its iCal-sourced blocks: add days the
// feed is busy, drop iCal blocks it no longer lists, and never touch manual
// blocks. Updates suppliers.ical_synced_at on success.
export async function syncSupplierCalendar(admin: SupabaseClient, supplierId: string, url: string): Promise<SyncResult> {
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: "The calendar link must start with http(s)://." };

  let text: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" }).finally(() => clearTimeout(timer));
    if (!res.ok) return { ok: false, error: `Couldn't read the calendar (HTTP ${res.status}).` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return { ok: false, error: "That calendar feed is too large." };
    text = new TextDecoder().decode(buf);
    if (!/BEGIN:VCALENDAR/i.test(text)) return { ok: false, error: "That link doesn't look like a calendar feed (no iCal data)." };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.name === "AbortError" ? "The calendar took too long to respond." : "Couldn't reach that calendar link." };
  }

  const busy = parseBusyDates(text);
  const today = todayUtc();

  // Existing upcoming supplier-level overrides, by day.
  const { data: existing } = await admin
    .from("availability_overrides")
    .select("id, day, source")
    .eq("supplier_id", supplierId)
    .is("product_id", null)
    .gte("day", today);
  const byDay = new Map<string, { id: string; source: string }>();
  for (const o of existing ?? []) byDay.set(o.day as string, { id: o.id as string, source: o.source as string });

  // Add a block for each busy day that has no override yet (leave manual blocks as-is).
  const toInsert = [...busy]
    .filter((d) => !byDay.has(d))
    .map((day) => ({ supplier_id: supplierId, day, blocked: true, source: "ical", created_by: null }));
  if (toInsert.length > 0) {
    const { error } = await admin.from("availability_overrides").insert(toInsert);
    if (error) { console.error("[ical] insert blocks failed:", error); return { ok: false, error: "Couldn't save the calendar's busy dates." }; }
  }

  // Drop iCal blocks the feed no longer lists (manual blocks are never removed).
  const staleIds = (existing ?? []).filter((o) => o.source === "ical" && !busy.has(o.day as string)).map((o) => o.id as string);
  if (staleIds.length > 0) {
    await admin.from("availability_overrides").delete().in("id", staleIds);
  }

  await admin.from("suppliers").update({ ical_synced_at: new Date().toISOString() }).eq("id", supplierId);
  return { ok: true, blockedDays: busy.size };
}
