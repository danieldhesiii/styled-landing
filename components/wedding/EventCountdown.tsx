"use client";

import { useEffect, useState } from "react";
import { daysToEvent } from "@/lib/event-plans";

export default function EventCountdown({
  name,
  date,
}: {
  name: string;
  date: string;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const days = now ? daysToEvent(date, now) : null;
  return (
    <div
      role="status"
      aria-label="Current event countdown"
      aria-live="polite"
      aria-atomic="true"
      className="min-w-0 w-full text-center"
    >
      <p
        title={name}
        className="truncate font-serif text-sm leading-snug text-ink sm:text-lg"
      >
        {name}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-ink/60 sm:text-xs">
        {days === null ? (
          ""
        ) : days > 0 ? (
          <>
            <span className="font-medium tabular-nums text-ink">
              {days} {days === 1 ? "day" : "days"}
            </span>{" "}
            to go
          </>
        ) : days === 0 ? (
          "Today"
        ) : (
          "Event complete"
        )}
      </p>
    </div>
  );
}
