// Operational attention threshold, not a promise about scheduled execution.
export const CALENDAR_STALE_MS = 48 * 60 * 60 * 1000;
export function calendarHealth(connected: boolean, syncedAt: string | null, now = Date.now()) {
  if (!connected) return "disconnected" as const;
  const time = syncedAt ? Date.parse(syncedAt) : NaN;
  if (!Number.isFinite(time) || time > now) return "never_synced" as const;
  return now - time >= CALENDAR_STALE_MS ? "stale" as const : "current" as const;
}
