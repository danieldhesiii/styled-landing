"use client";

export type StudioTab =
  | "catalogue"
  | "venues"
  | "saved"
  | "looks"
  | "boards"
  | "visualiser"
  | "wedding"
  | "orders";
const destinations = [
  {
    id: "catalogue",
    label: "Browse",
    path: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  },
  {
    id: "saved",
    label: "Saved",
    path: "M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  },
  {
    id: "visualiser",
    label: "Visualise",
    path: "M4 4h16v16H4z M4 16l5-5 4 4 3-3 4 4 M8 8h.01",
  },
  {
    id: "wedding",
    label: "My wedding",
    path: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
  },
  {
    id: "orders",
    label: "My orders",
    path: "M5 3h14v18l-3-2-4 2-4-2-3 2z M9 7h6 M9 11h6",
  },
] as const;
export function primarySection(tab: StudioTab) {
  if (tab === "venues") return "catalogue";
  if (tab === "looks" || tab === "boards") return "saved";
  return tab;
}
export default function StudioNavigation({
  active,
  onSelect,
  mobile = false,
}: {
  active: StudioTab;
  onSelect: (tab: StudioTab) => void;
  mobile?: boolean;
}) {
  return (
    <nav
      aria-label={mobile ? "Mobile studio" : "Studio"}
      className={
        mobile
          ? "fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-sand bg-cream px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
          : "hidden items-center gap-9 md:flex"
      }
    >
      {destinations.map(({ id, label, path }) => {
        const selected = primarySection(active) === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => onSelect(id)}
            className={
              mobile
                ? `flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors ${selected ? "bg-clay/10 text-ink" : "text-ink/60 hover:text-ink"}`
                : `min-h-14 border-b-2 text-sm transition-colors ${selected ? "border-clay font-medium text-ink" : "border-transparent text-ink/60 hover:border-sand hover:text-ink"}`
            }
          >
            {mobile && (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={path} />
              </svg>
            )}
            {label}
          </button>
        );
      })}
    </nav>
  );
}
