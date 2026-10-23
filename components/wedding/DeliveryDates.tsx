"use client";
import type { PlanningDetails } from "@/lib/wedding";
import { deliveryDay, deliveryError } from "@/lib/wedding";
import { todayUtc } from "@/lib/availability";
export default function DeliveryDates({
  weddingDate,
  deliverySameDay = true,
  deliveryDate = "",
  onChange,
  id = "wedding",
  compact = false,
}: PlanningDetails & {
  weddingDate: string;
  onChange: (
    patch: Partial<PlanningDetails> & { weddingDate?: string },
  ) => void;
  id?: string;
  compact?: boolean;
}) {
  const error =
    weddingDate && deliveryDay({ weddingDate, deliverySameDay, deliveryDate })
      ? deliveryError(
          weddingDate,
          deliveryDay({ weddingDate, deliverySameDay, deliveryDate }),
        )
      : null;
  const field =
    "mt-2 block w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2.5 text-sm";
  return (
    <fieldset
      className={
        compact ? "grid gap-4 sm:grid-cols-3 sm:items-end" : "space-y-4"
      }
    >
      <legend className="mb-3 font-serif text-2xl">
        Wedding and delivery dates
      </legend>
      <label className="block text-sm" htmlFor={`${id}-event`}>
        Wedding day
        <input
          id={`${id}-event`}
          type="date"
          min={todayUtc()}
          value={weddingDate}
          onChange={(e) => onChange({ weddingDate: e.target.value })}
          className={field}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={deliverySameDay}
          onChange={(e) => onChange({ deliverySameDay: e.target.checked })}
          className="h-4 w-4 accent-clay"
        />
        Delivery is the same as my wedding day
      </label>
      {!deliverySameDay && (
        <label className="block text-sm" htmlFor={`${id}-delivery`}>
          Delivery day
          <input
            id={`${id}-delivery`}
            type="date"
            min={todayUtc()}
            max={weddingDate || undefined}
            value={deliveryDate}
            onChange={(e) => onChange({ deliveryDate: e.target.value })}
            className={field}
          />
        </label>
      )}
      <p className="text-xs leading-relaxed text-ink/60 sm:col-span-3">
        Getting married on Sunday? Choose Saturday delivery to allow time to set
        up. Delivery times, charges and collection are confirmed with your
        suppliers.
      </p>
      {error && (
        <p role="alert" className="text-sm text-clay sm:col-span-3">
          {error}
        </p>
      )}
    </fieldset>
  );
}
