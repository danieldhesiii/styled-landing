import { isValidDay, todayUtc } from "./availability";

export interface HireDates { start: string; end: string }
export function hireDateError(start: unknown, end: unknown, today = todayUtc()): string | null {
  if (!isValidDay(start) || !isValidDay(end)) return "Choose valid delivery and return dates.";
  if (start < today || end < today) return "Choose dates today or later.";
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCFullYear(limit.getUTCFullYear() + 5);
  if (end > limit.toISOString().slice(0, 10)) return "Choose dates within the next five years.";
  if (end < start) return "Return or collection must be on or after delivery.";
  if ((Date.parse(end) - Date.parse(start)) / 86400000 > 31)
    return "Choose delivery and return dates within 31 days of each other. Contact support@styleduk.com for longer hires.";
  return null;
}
export function itemHireDates(line: { hireDates?: HireDates }, defaults: HireDates): HireDates {
  return line.hireDates ?? defaults;
}
export function dateRangeLabel(start: string | null | undefined, end: string | null | undefined): string {
  const format = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  if (!start) return "Dates to be confirmed";
  return !end || start === end ? format(start) : `${format(start)} to ${format(end)}`;
}
// Reject unknown item IDs, partial ranges and malformed input rather than silently
// falling back to wedding dates. Used by preview and order submission alike.
export function resolveHireDates(
  raw: unknown, ids: string[], defaults: HireDates,
): Map<string, HireDates> {
  const problem = hireDateError(defaults.start, defaults.end);
  if (problem) throw new Error(problem);
  if (raw !== undefined && (!raw || typeof raw !== "object" || Array.isArray(raw)))
    throw new Error("Invalid item dates.");
  const overrides = (raw ?? {}) as Record<string, unknown>;
  const allowed = new Set(ids);
  for (const key of Object.keys(overrides)) if (!allowed.has(key)) throw new Error("Dates were supplied for an item outside your basket.");
  return new Map(ids.map(id => {
    const value = overrides[id];
    if (value === undefined) return [id, defaults];
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid item dates.");
    const { start, end } = value as Record<string, unknown>;
    const issue = hireDateError(start, end);
    if (issue) throw new Error(issue);
    return [id, { start: start as string, end: end as string }];
  }));
}

export function hireDays(start: string, end: string): string[] {
  if (!isValidDay(start) || !isValidDay(end) || end < start || (Date.parse(end)-Date.parse(start))/86400000 > 31) return [];
  const result: string[] = [], d = new Date(`${start}T12:00:00Z`);
  while (d.toISOString().slice(0, 10) <= end) {
    result.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return result;
}
