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
  if (days === null) {
    return <span className="text-xs text-ink/75">Set event date</span>;
  }

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const caption = days === 1 ? "day to go" : "days to go";

  return (
    <span role="status" aria-label="Current event countdown" className="inline-flex items-center gap-2 text-left">
      {days > 0 && (
        <span className="font-serif text-[26px] leading-none lining-nums tracking-tight text-ink sm:text-[30px]">
          {days}
        </span>
      )}
      <span className="flex flex-col gap-0.5 whitespace-nowrap">
        <span className="text-[11px] font-medium leading-tight tracking-wide text-ink">
          {days > 0 ? caption : days === 0 ? "Today" : "Event complete"}
        </span>
        <time dateTime={date} title={name} className="text-[11px] leading-tight text-ink/65">
          {dateLabel}
        </time>
      </span>
    </span>
  );
}
