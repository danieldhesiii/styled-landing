"use client";
import { useEffect, useId, useRef, useState } from "react";
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
  onEditDates,
}: {
  onEditDates?: () => void;
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
  const addButton = useRef<HTMLButtonElement>(null);
  const [creating, setCreating] = useState(false);
  function cancelAdding() {
    if (creating || disabled) return;
    setAdding(false);
    setName("");
    setKind("ceremony");
    addButton.current?.focus();
  }
  const [infoOpen, setInfoOpen] = useState(false);
  const infoId = useId();
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
      className="mt-4 border-b border-sand pb-4"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:items-center">
        <label className="min-w-0 text-xs text-ink/60 sm:w-60 sm:shrink-0">
          Currently planning
          <select
            aria-label="Currently planning"
            value={activeId}
            disabled={disabled}
            onChange={(e) => void onSwitch(e.target.value)}
            className="mt-1.5 block min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm font-medium text-ink disabled:opacity-50"
          >
            {options.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <p
          className="flex min-h-11 items-center gap-1 text-xs text-ink/60 sm:flex-1"
          aria-live="polite"
        >
          {days === null ? (
            onEditDates ? (
              <button
                type="button"
                onClick={onEditDates}
                className="min-h-11 whitespace-nowrap underline underline-offset-4"
              >
                Set date
              </button>
            ) : (
              "Date not set"
            )
          ) : days > 0 ? (
            <>
              <strong className="tabular-nums text-ink">
                {days} {days === 1 ? "day" : "days"}
              </strong>{" "}
              to go
            </>
          ) : days === 0 ? (
            "Today"
          ) : (
            "Event complete"
          )}
        </p>
        <div className="col-span-2 flex items-center gap-2 sm:ml-auto">
          <button
            type="button"
            ref={addButton}
            disabled={disabled || creating || (!adding && events.length >= 12)}
            onClick={() => (adding ? cancelAdding() : setAdding(true))}
            aria-expanded={adding}
            className="min-h-11 rounded-full border border-sand px-4 text-sm disabled:opacity-50"
          >
            {adding ? "Close" : "+ Add event"}
          </button>
          {dirty ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onSave()}
              className="min-h-11 rounded-full bg-ink px-4 text-sm text-cream disabled:opacity-40"
            >
              {disabled ? "Please wait…" : "Save plan"}
            </button>
          ) : (
            <span role="status" className="px-2 text-xs text-ink/50">
              Saved
            </span>
          )}
          <button
            type="button"
            aria-label="About event plans"
            aria-expanded={infoOpen}
            aria-controls={infoId}
            onClick={() => setInfoOpen(!infoOpen)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/60 hover:bg-sand/40"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M12 11v6m0-10v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {infoOpen && (
        <p
          id={infoId}
          className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/70"
        >
          Keep separate dates, venues and baskets for each event. Switching
          events saves your current plan. Boards and saved ideas are shared
          across events. Submit each basket separately.
        </p>
      )}
      {adding && (
        <form
          className="mt-4 grid gap-3 border-t border-sand pt-4 sm:grid-cols-[1fr_1fr_auto]"
          aria-label="Add event"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !creating && !disabled) {
              e.preventDefault();
              e.stopPropagation();
              cancelAdding();
            }
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (creating || disabled || !name.trim()) return;
            setCreating(true);
            try {
              if (await onCreate(name.trim(), kind)) {
                setAdding(false);
                setName("");
                setKind("ceremony");
              }
            } finally {
              setCreating(false);
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
          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              disabled={disabled || creating}
              onClick={cancelAdding}
              className="min-h-11 rounded-full border border-sand px-4 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled || creating || !name.trim()}
              className="min-h-11 rounded-full bg-ink px-4 text-sm text-cream disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create event"}
            </button>
          </div>
          <p className="text-xs text-ink/60 sm:col-span-3">
            Starts with your current date and guest count. You can change both.
          </p>
        </form>
      )}
    </section>
  );
}
