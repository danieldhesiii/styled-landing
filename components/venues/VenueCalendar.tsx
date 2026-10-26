"use client";
import { isValidDay } from "@/lib/availability";
import { useEffect, useState } from "react";
export default function VenueCalendar({
  slug,
  value,
  onChange,
  rangeStart,
  rangeEnd,
}: {
  slug: string;
  rangeStart?: string;
  rangeEnd?: string;
  value: string;
  onChange: (day: string) => void;
}) {
  const [month, setMonth] = useState(
      () => { const d = isValidDay(value) ? new Date(`${value}T12:00:00`) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); },
    ),
    [blocked, setBlocked] = useState<string[] | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (isValidDay(value)) {
      const d = new Date(`${value}T12:00:00`);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);
  useEffect(() => {
    const controller = new AbortController();
    setBlocked(null);
    setFailed(false);
    fetch(`/api/venues/${encodeURIComponent(slug)}/dates`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const d = await r.json();
        setBlocked(d.blockedDates);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [slug]);
  const year = month.getFullYear(),
    m = month.getMonth(),
    count = new Date(year, m + 1, 0).getDate(),
    offset = (month.getDay() + 6) % 7;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return (
    <div className="rounded-xl border border-sand p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth(new Date(year, m - 1, 1))}
          className="p-3"
        >
          ←
        </button>
        <p aria-live="polite">
          {month.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth(new Date(year, m + 1, 1))}
          className="p-3"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d} className="py-2 text-xs text-ink/50">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = `${year}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          const unavailable = day < today || blocked?.includes(day);
          return (
            <button
              key={day}
              type="button"
              disabled={unavailable || !blocked}
              aria-pressed={value === day}
              aria-label={`${day}${unavailable ? " unavailable" : ""}`}
              onClick={() => onChange(day)}
              className={`rounded-lg py-2 disabled:opacity-25 ${value === day ? "bg-ink text-cream" : rangeStart && rangeEnd && day >= rangeStart && day <= rangeEnd ? "bg-clay/15 text-ink" : "hover:bg-sand"}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p role="status" className="mt-3 text-xs text-ink/60">
        {failed
          ? "Date checks are temporarily unavailable. You can still request a date below."
          : !blocked
            ? "Checking dates…"
            : "Unavailable dates are disabled. All other dates are requests, subject to confirmation."}
      </p>
    </div>
  );
}
