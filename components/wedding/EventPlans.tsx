"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { EventPlan } from "@/lib/wedding";

export default function EventPlans({
  compact = false,
  events,
  activeId,
  disabled,
  dirty,
  onSave,
  onSwitch,
  onCreate,
}: {
  compact?: boolean;
  events: EventPlan[];
  activeId: string;
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const area = useRef<HTMLElement>(null);
  useEffect(() => {
    if ((!toolsOpen && !infoOpen && !adding) || creating) return;
    const closeOutside = (event: MouseEvent) => {
      if (event.target instanceof Element && !event.target.closest("dialog") && !area.current?.contains(event.target)) { setToolsOpen(false); setInfoOpen(false); setAdding(false); }
    };
    document.addEventListener("click", closeOutside, true);
    return () => document.removeEventListener("click", closeOutside, true);
  }, [toolsOpen, infoOpen, adding, creating]);
  const toolsId = useId();
  const infoId = useId();
  const currentName =
    events.find((e) => e.id === activeId)?.name || "Wedding day";
  const options = events.length
    ? events
    : [{ id: activeId, name: currentName }];
  return (
    <section ref={area} aria-label="Event plans" className={compact ? "min-w-0 py-1" : "min-w-0 border-b border-sand py-3"}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0 sm:gap-x-4">
        <label className="min-w-24 flex-1 sm:w-52 sm:flex-none">
          <span className="sr-only">Currently planning</span>
          <select
            aria-label="Currently planning"
            value={activeId}
            disabled={disabled}
            onChange={(e) => void onSwitch(e.target.value)}
            className="block min-h-11 w-full min-w-0 cursor-pointer rounded-md border border-transparent bg-transparent py-2 pl-0 pr-5 text-sm font-medium text-ink hover:border-sand focus-visible:border-clay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:opacity-50"
          >
            {options.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
          </select>
        </label>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          {dirty ? <button type="button" disabled={disabled} onClick={() => void onSave()} className="min-h-11 rounded-md bg-ink px-3 text-xs text-cream disabled:opacity-40">{disabled ? "Saving…" : "Save plan"}</button> : <span role="status" className="hidden text-xs text-ink/45 sm:inline">Saved</span>}
          <button type="button" aria-label="Manage event" aria-expanded={toolsOpen} aria-controls={toolsId} onClick={() => setToolsOpen(!toolsOpen)} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-xs text-ink/65 hover:bg-sand/30 hover:text-ink">
            {toolsOpen ? "Close" : "Manage"}<span aria-hidden="true">{toolsOpen ? "−" : "+"}</span>
          </button>
        </div>
      </div>
      {toolsOpen && <div id={toolsId} className="studio-panel border-t border-sand py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <button type="button" ref={addButton} disabled={disabled || creating || (!adding && events.length >= 12)} onClick={() => adding ? cancelAdding() : setAdding(true)} aria-expanded={adding} className="min-h-11 text-sm text-ink underline underline-offset-4 disabled:opacity-50">{adding ? "Cancel new event" : "Add event"}</button>
          <button type="button" aria-expanded={infoOpen} aria-controls={infoId} onClick={() => setInfoOpen(!infoOpen)} className="min-h-11 text-xs text-ink/60 hover:text-ink">About event plans</button>
        </div>
        {infoOpen && <p id={infoId} className="max-w-xl pb-2 text-xs leading-relaxed text-ink/65">Dates, venues, preview selections and baskets stay with each event. Switching saves your plan. Saved items and looks are shared across events.</p>}
      </div>}
      {toolsOpen && adding && (
        <form
          className="studio-panel grid gap-3 border-t border-sand py-4 sm:grid-cols-[1fr_1fr_auto]"
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
              autoFocus
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
              className="min-h-11 rounded-md border border-sand px-4 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled || creating || !name.trim()}
              className="min-h-11 rounded-md bg-ink px-4 text-sm text-cream disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create event"}
            </button>
          </div>
          <p className="text-xs text-ink/60 sm:col-span-3">
            Starts with its own venue, dates, guest count and empty basket.
          </p>
        </form>
      )}
    </section>
  );
}
