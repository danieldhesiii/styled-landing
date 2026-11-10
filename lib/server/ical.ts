import type { SupabaseClient } from "@supabase/supabase-js";
import { todayUtc } from "@/lib/availability";
import { fetchCalendarFeed } from "@/lib/server/calendar-feed";

// Minimal iCalendar (.ics) handling for supplier calendar sync.
//
// We only need one thing from a feed: which future days is the supplier busy? So
// we read each VEVENT's start/end date and mark those days blocked. This covers
// the common Google Calendar / Booqable / Current RMS exports (all-day and timed
// events). Unsupported recurrence is rejected before any dates are changed.
// Silently importing only the first occurrence could release booked stock.
// Dates use the feed's local calendar day, not a supplier timezone conversion.

const MAX_BYTES = 2 * 1024 * 1024; // don't ingest huge feeds
const HORIZON_DAYS = 550; // ~18 months of weddings ahead

// Unfold RFC 5545 line folding (continuation lines start with space or tab).
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// "20270618" or "20270618T130000Z" → "2027-06-18"
function dateOf(value: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(?:[01]\d|2[0-3])[0-5]\d[0-5]\dZ?)?$/);
  if (!m) return null;
  const day = `${m[1]}-${m[2]}-${m[3]}`;
  const stamp = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(stamp.getTime()) && ymd(stamp) === day ? day : null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}

// The set of future YYYY-MM-DD dates the feed marks busy (within the horizon).
export function parseBusyDates(ics: string): Set<string> {
  if (Buffer.byteLength(ics, "utf8") > MAX_BYTES) throw Error("That calendar feed is too large.");
  const lines = unfold(ics);
  if (lines.filter(l => l.trim() === "BEGIN:VCALENDAR").length !== 1 || lines.filter(l => l.trim() === "END:VCALENDAR").length !== 1 || lines.find(l => l.trim())?.trim() !== "BEGIN:VCALENDAR" || lines.filter(l => l.trim()).at(-1)?.trim() !== "END:VCALENDAR")
    throw Error("The calendar feed is incomplete. Existing blocks were kept.");
  const today = todayUtc();
  const limit = addDays(today, HORIZON_DAYS);
  const busy = new Set<string>();

  let inEvent = false;
  let start: string | null = null;
  let end: string | null = null;
  let allDay = false;
  let cancelled = false;
  let transparent = false;
  let unsupported = false;
  let midnightEnd = false;
  let calendarEnded = false;
  let alarmDepth = 0;

  const flush = () => {
    if (!cancelled && !transparent) {
      if (unsupported) throw Error("This feed contains repeating or unsupported events. Existing blocks were kept. Export individual bookings or block the repeating dates manually.");
      if (!start || (end && end < start)) throw Error("A calendar event has invalid dates. Existing blocks were kept.");
      // All-day DTEND is exclusive; timed/no-end spans through the end date.
      const last = end ? (allDay || midnightEnd ? addDays(end, -1) : end) : start;
      if (last < start) throw Error("A calendar event has no valid hire period. Existing blocks were kept.");
      for (let d = start < today ? today : start; d <= last; d = addDays(d, 1)) {
        if (d >= today && d <= limit) busy.add(d);
        if (d > limit) break;
      }
    }
    start = end = null;
    allDay = cancelled = transparent = unsupported = midnightEnd = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "END:VCALENDAR") { if (inEvent) throw Error("The calendar feed is incomplete. Existing blocks were kept."); calendarEnded = true; }
    if (line === "BEGIN:VEVENT") { if (inEvent || calendarEnded) throw Error("The calendar feed is incomplete. Existing blocks were kept."); inEvent = true; start = end = null; allDay = cancelled = transparent = unsupported = midnightEnd = false; continue; }
    if (line === "END:VEVENT") { if (!inEvent || alarmDepth) throw Error("The calendar feed is incomplete. Existing blocks were kept."); flush(); inEvent = false; continue; }
    if (!inEvent) continue;
    if (line === "BEGIN:VALARM") { alarmDepth++; continue; }
    if (line === "END:VALARM") { if (!alarmDepth) throw Error("Invalid calendar alarm."); alarmDepth--; continue; }
    if (alarmDepth) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const left = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const name = left.split(";")[0].toUpperCase();

    if (name === "DTSTART") { if (start || !dateOf(value)) throw Error("A calendar event has invalid dates. Existing blocks were kept."); start = dateOf(value); if (/VALUE=DATE(?!-TIME)/i.test(left) || /^\d{8}$/.test(value)) allDay = true; }
    else if (name === "DTEND") { if (end || !dateOf(value)) throw Error("A calendar event has invalid dates. Existing blocks were kept."); end = dateOf(value); midnightEnd = /T000000Z?$/.test(value); }
    else if (name === "STATUS" && value.toUpperCase() === "CANCELLED") { cancelled = true; }
    else if (name === "TRANSP" && value.toUpperCase() === "TRANSPARENT") { transparent = true; }
    else if (["RRULE", "RDATE", "EXDATE", "EXRULE", "RECURRENCE-ID", "DURATION"].includes(name)) { unsupported = true; }
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
  let text: string;
  try {
    text = await fetchCalendarFeed(url);
  } catch {
    return { ok: false, error: "Could not read the calendar safely. Use its direct, public HTTPS feed link. Existing blocks were kept." };
  }

  let busy: Set<string>;
  try { busy = parseBusyDates(text); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Could not read calendar dates. Existing blocks were kept." }; }
  const today = todayUtc();

  // Existing upcoming supplier-level overrides, by day.
  const { data: existing, error: existingError } = await admin
    .from("availability_overrides")
    .select("id, day, source")
    .eq("supplier_id", supplierId)
    .is("product_id", null)
    .gte("day", today);
  if (existingError) return { ok: false, error: "Could not read existing calendar blocks. Please retry." };
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
    const { error } = await admin.from("availability_overrides").delete().eq("supplier_id", supplierId).eq("source", "ical").in("id", staleIds);
    if (error) return { ok: false, error: "Could not remove old calendar blocks. Please retry." };
  }

  const { error: stampError } = await admin.from("suppliers").update({ ical_synced_at: new Date().toISOString() }).eq("id", supplierId);
  if (stampError) return { ok: false, error: "Dates were synced but the success time could not be saved. Please retry." };
  return { ok: true, blockedDays: busy.size };
}
