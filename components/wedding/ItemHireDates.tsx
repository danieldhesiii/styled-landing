"use client";
import {
  hireDateError,
  itemHireDates,
  dateRangeLabel,
  type HireDates,
} from "@/lib/booking-dates";
import type { BasketLine } from "@/lib/types";
import { todayUtc } from "@/lib/availability";
export default function ItemHireDates({
  line,
  name,
  defaults,
  onChange,
  id,
  compact = false,
}: {
  line: BasketLine;
  name: string;
  defaults: HireDates;
  compact?: boolean;
  onChange: (itemId: string, dates?: HireDates) => void;
  id: string;
}) {
  const dates = itemHireDates(line, defaults);
  const issue = hireDateError(dates.start, dates.end);
  return (
    <fieldset
      className={
        compact
          ? "min-w-0 border-t border-sand px-3 pb-3 text-xs"
          : "mt-2 min-w-0 rounded-xl bg-cream/60 p-3 text-xs"
      }
    >
      <legend className="sr-only">Hire dates for {name}</legend>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={!!line.hireDates}
          className="h-4 w-4 accent-clay"
          onChange={(e) =>
            onChange(
              line.itemId,
              e.target.checked ? { ...defaults } : undefined,
            )
          }
        />
        Different dates for this item
      </label>
      {line.hireDates ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-start`}>
            Delivery / collect from supplier
            <input
              id={`${id}-start`}
              type="date"
              min={todayUtc()}
              value={dates.start}
              onChange={(e) =>
                onChange(line.itemId, { ...dates, start: e.target.value })
              }
              className="mt-1 block w-full min-w-0 rounded-lg border border-sand bg-white p-2.5 text-sm"
            />
          </label>
          <label htmlFor={`${id}-end`}>
            Return / supplier collection
            <input
              id={`${id}-end`}
              type="date"
              min={dates.start || todayUtc()}
              value={dates.end}
              onChange={(e) =>
                onChange(line.itemId, { ...dates, end: e.target.value })
              }
              className="mt-1 block w-full min-w-0 rounded-lg border border-sand bg-white p-2.5 text-sm"
            />
          </label>
        </div>
      ) : (
        <p className="text-ink/60">
          Default hire: {dateRangeLabel(dates.start, dates.end)}
        </p>
      )}
      {issue && (
        <p role="alert" className="mt-2 text-red-700">
          {issue}
        </p>
      )}
    </fieldset>
  );
}
