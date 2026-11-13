"use client";
import { useState, useRef, useEffect } from "react";
import type { StudioTab } from "@/lib/studio-route";
export type { StudioTab } from "@/lib/studio-route";

export function primarySection(tab: StudioTab) {
  if (["catalogue", "venues"].includes(tab)) return "browse";
  if (["saved", "looks"].includes(tab)) return "saved";
  return tab;
}
const destinations = [
  { id: "wedding", label: "Plan", path: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 11h16" },
  { id: "browse", label: "Browse", path: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" },
  { id:"boards", label:"Boards", path:"M3 4h8v7H3z M14 4h7v12h-7z M3 14h8v6H3z" },
  { id: "saved", label: "Saved", path: "M5 3h14v18l-7-5-7 5z" },
  { id: "visualiser", label: "Visualise", path: "M4 4h16v16H4z M4 16l5-5 4 4 3-3 4 4 M8 8h.01" },
  { id: "orders", label: "Bookings", path: "M5 3h14v18l-3-2-4 2-4-2-3 2z M9 7h6 M9 11h6" },
] as const;
export default function StudioNavigation({ active, onSelect, mobile = false, venueSuppliers = false }: {
  active: StudioTab; onSelect: (tab: StudioTab) => void; mobile?: boolean; venueSuppliers?: boolean;
}) {
  const [browse, setBrowse] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!browse) return;
    const close = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) setBrowse(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [browse]);
  useEffect(() => setBrowse(false), [active]);
  return <nav aria-label={mobile ? "Mobile studio" : "Studio"} className={mobile
    ? "fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-sand bg-cream/95 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
    : "hidden min-w-0 items-center justify-center gap-4 md:flex lg:gap-7"}>
    {destinations.map((destination) => {
      const selected = primarySection(active) === destination.id;
      return <div key={destination.id} ref={destination.id === "browse" ? menu : undefined} className="relative min-w-0" onKeyDown={(event) => {
        if (event.key === "Escape") { setBrowse(false); event.currentTarget.querySelector("button")?.focus(); }
      }}>
        <button type="button" aria-current={selected ? "page" : undefined} aria-expanded={destination.id === "browse" ? browse : undefined} aria-haspopup={destination.id === "browse" ? true : undefined}
          onClick={() => { if (destination.id === "browse") setBrowse(!browse); else { setBrowse(false); onSelect(destination.id); } }}
          className={mobile
            ? `flex min-h-14 w-full flex-col items-center justify-center gap-1 border-t-2 text-[11px] ${selected ? "border-ink font-medium text-ink" : "border-transparent text-ink/55 hover:text-ink"}`
            : `inline-flex min-h-14 items-center gap-1.5 border-b text-sm ${selected ? "border-ink font-medium text-ink" : "border-transparent text-ink/55 hover:border-sand hover:text-ink"}`}>
          {mobile && <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={destination.path} /></svg>}
          {destination.label}{destination.id === "browse" && !mobile && <span aria-hidden="true" className="text-[10px]">⌄</span>}
        </button>
        {destination.id === "browse" && browse && <div className={`${mobile ? "bottom-full mb-2" : "top-full mt-1"} studio-panel absolute left-0 z-50 w-52 rounded-lg border border-sand bg-cream p-1.5`} aria-label="Browse options">
          {([["catalogue", venueSuppliers ? "Venue suppliers" : "Catalogue products"], ["venues", "Find venues"]] as [StudioTab, string][]).map(([id, label]) => <button key={id} type="button" aria-current={active === id ? "page" : undefined} className="block min-h-11 w-full rounded-md px-3 text-left text-sm hover:bg-sand/40" onClick={() => { setBrowse(false); onSelect(id); }}>{label}</button>)}
        </div>}
      </div>;
    })}
  </nav>;
}
