"use client";
import ContextHelp from "@/components/ui/ContextHelp";
import type { PlanningDetails } from "@/lib/wedding";
import { deliveryDay, deliveryError } from "@/lib/wedding";
import { hireDateError } from "@/lib/booking-dates";
import { todayUtc } from "@/lib/availability";
export default function DeliveryDates({
  weddingDate,
  deliverySameDay = true,
  deliveryDate = "",
  returnDate = "",
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
  const previousDay = (date: string) => date
    ? new Date(Date.parse(date + "T12:00:00Z") - 86400000).toISOString().slice(0, 10)
    : "";
  const dayBefore = previousDay(weddingDate);
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
      <legend className="mb-3 font-serif text-2xl">Event and hire dates</legend>
      <label className="block text-sm" htmlFor={`${id}-event`}>
        Event date
        <input
          id={`${id}-event`}
          type="date"
          min={todayUtc()}
          value={weddingDate}
          onChange={(e) => onChange({
            weddingDate: e.target.value,
            ...(!deliverySameDay && deliveryDate === dayBefore
              ? { deliveryDate: previousDay(e.target.value) }
              : {}),
            ...(returnDate === weddingDate ? { returnDate: e.target.value } : {}),
          })}
          className={field}
        />
      </label>
      <label className="block text-sm" htmlFor={`${id}-delivery-choice`}>
        Requested delivery / access
        <select
          id={`${id}-delivery-choice`}
          value={deliverySameDay ? "same" : deliveryDate && deliveryDate === dayBefore ? "before" : "custom"}
          onChange={(e) => onChange(e.target.value === "same"
            ? { deliverySameDay: true }
            : { deliverySameDay: false, deliveryDate: e.target.value === "before" ? dayBefore : deliveryDate })}
          className={field}
        >
          <option value="same">On the event day</option>
          <option value="before" disabled={!weddingDate}>The day before the event</option>
          <option value="custom">Choose another delivery day</option>
        </select>
      </label>
      {!deliverySameDay && (
        <label className="block text-sm" htmlFor={`${id}-delivery`}>
          Requested delivery day
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
      <label className="block text-sm" htmlFor={`${id}-return`}>
        Return / supplier collection day
        <input
          id={`${id}-return`}
          type="date"
          min={weddingDate || todayUtc()}
          value={returnDate || weddingDate}
          onChange={(e) => onChange({ returnDate: e.target.value })}
          className={field}
        />
      </label>
      <div className="sm:col-span-3">
        <p className="text-xs leading-relaxed text-ink/70">
          These are the default dates for this event. Change individual item
          dates in Basket. Suppliers must confirm availability and timing.
        </p>
        <ContextHelp title="Choosing delivery and return dates">
          <p>
            For a Sunday celebration, you might need Saturday delivery and
            Monday return. Include setup time and agree an arrival deadline well
            in advance. Suppliers confirm delivery, collection and any extra
            hire charges before booking.
          </p>
        </ContextHelp>
      </div>
      {returnDate &&
        hireDateError(
          deliveryDay({ weddingDate, deliverySameDay, deliveryDate }),
          returnDate,
        ) && (
          <p role="alert" className="text-sm text-clay sm:col-span-3">
            {hireDateError(
              deliveryDay({ weddingDate, deliverySameDay, deliveryDate }),
              returnDate,
            )}
          </p>
        )}
      {error && (
        <p role="alert" className="text-sm text-clay sm:col-span-3">
          {error}
        </p>
      )}
    </fieldset>
  );
}
