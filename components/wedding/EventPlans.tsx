"use client";
import { useEffect, useState } from "react";
import type { EventPlan, WeddingBrief } from "@/lib/wedding";
import { daysToEvent } from "@/lib/event-plans";

export default function EventPlans({
  events,
  activeId,
  brief,
  disabled,
  dirty,
  onSave,
  onSwitch,
  onCreate,
}: {
  events: EventPlan[];
  activeId: string;
  brief: WeddingBrief;
  disabled: boolean;
  dirty: boolean;
  onSave: () => Promise<boolean>;
  onSwitch: (id: string) => Promise<boolean>;
  onCreate: (name: string, kind: EventPlan["kind"]) => Promise<boolean>;
}) {
  const [adding, setAdding] = useState(false),
    [name, setName] = useState(""),
    [kind, setKind] = useState<EventPlan["kind"]>("ceremony");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const days = now ? daysToEvent(brief.weddingDate, now) : null;
  const currentName =
    events.find((e) => e.id === activeId)?.name || "Wedding day";
  const options = events.length
    ? events
    : [{ id: activeId, name: currentName }];
  return (
    <section
      aria-label="Event plans"
      className="mt-5 rounded-2xl border border-sand bg-white px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-0 flex-1 text-xs text-ink/60 sm:max-w-xs">
          Currently planning
          <select
            aria-label="Currently planning"
            value={activeId}
            disabled={disabled}
            onChange={(e) => void onSwitch(e.target.value)}
            className="mt-1 block min-h-11 w-full rounded-lg border border-sand bg-cream px-3 text-sm font-medium text-ink disabled:opacity-50"
          >
            {options.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <p className="flex-1 text-sm text-ink/70" aria-live="polite">
          {days === null ? (
            "Add your event date in Wedding plan for a countdown."
          ) : days > 0 ? (
            <>
              <strong className="tabular-nums text-ink">
                {days} {days === 1 ? "day" : "days"}
              </strong>{" "}
              until {currentName}
            </>
          ) : days === 0 ? (
            `${currentName} is today`
          ) : (
            `${currentName} has taken place`
          )}
        </p>
        <button
          type="button"
          disabled={disabled || events.length >= 12}
          onClick={() => setAdding(!adding)}
          aria-expanded={adding}
          className="min-h-11 rounded-full border border-sand px-4 text-sm disabled:opacity-50"
        >
          + Add event
        </button>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => void onSave()}
          className="min-h-11 rounded-full bg-ink px-4 text-sm text-cream disabled:opacity-40"
        >
          {disabled ? "Please wait…" : dirty ? "Save plan" : "Saved"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink/60">
        Each event has its own venue, date, guest count, budget, basket and
        latest preview. Boards and saved inspiration are shared. Switching
        events saves your current plan first. Submit each event’s basket
        separately.
      </p>
      {adding && (
        <form
          className="mt-4 grid gap-3 border-t border-sand pt-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onCreate(name.trim(), kind)) {
              setAdding(false);
              setName("");
            }
          }}
        >
          <label className="text-xs">
            Event name
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ceremony, reception or welcome dinner"
              className="mt-2 block min-h-11 w-full rounded-lg border border-sand px-3 text-sm"
            />
          </label>
          <label className="text-xs">
            Event type
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as EventPlan["kind"])}
              className="mt-2 block min-h-11 w-full rounded-lg border border-sand px-3 text-sm"
            >
              <option value="ceremony">Ceremony</option>
              <option value="reception">Reception</option>
              <option value="party">Party</option>
              <option value="other">Other event</option>
            </select>
          </label>
          <button
            disabled={disabled || !name.trim()}
            className="min-h-11 self-end rounded-full bg-ink px-4 text-sm text-cream disabled:opacity-50"
          >
            Create event
          </button>
          <p className="text-xs text-ink/60 sm:col-span-3">
            Your new event starts with the current date and guest estimate. Set
            its own venue, dates and budget in Wedding plan.
          </p>
        </form>
      )}
    </section>
  );
}
