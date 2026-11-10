"use client";
import { useState } from "react";
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
  const [editing, setEditing] = useState(false);
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
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <p className="py-2 text-ink/70">
          {dateRangeLabel(dates.start, dates.end)}
          {line.hireDates ? " · Item dates" : " · Event dates"}
        </p>
        <button
          type="button"
          aria-expanded={editing}
          aria-controls={`${id}-editor`}
          onClick={() => setEditing(!editing)}
          className="min-h-11 underline underline-offset-4"
        >
          {editing ? "Done" : "Change dates"}
        </button>
      </div>
      {editing && (
        <div id={`${id}-editor`} className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-start`}>
            Delivery / collect from supplier
            <input
              id={`${id}-start`}
              type="date"
              min={todayUtc()}
              value={dates.start}
              onChange={(e) => onChange(line.itemId, { ...dates, start: e.target.value })}
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
              onChange={(e) => onChange(line.itemId, { ...dates, end: e.target.value })}
              className="mt-1 block w-full min-w-0 rounded-lg border border-sand bg-white p-2.5 text-sm"
            />
          </label>
          {line.hireDates && (
            <button type="button" onClick={() => onChange(line.itemId, undefined)} className="min-h-11 text-left underline underline-offset-4 sm:col-span-2">
              Use event dates
            </button>
          )}
        </div>
      )}
      {issue && (
        <p role="alert" className="mt-2 text-red-700">
          {issue}
        </p>
      )}
    </fieldset>
  );
}
