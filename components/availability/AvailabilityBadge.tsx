import { availabilityLabel, type BadgeTone, type ItemAvailability } from "@/lib/availability";

const TONE: Record<BadgeTone, string> = {
  ok: "bg-sage/15 text-sage",
  warn: "bg-clay/15 text-clay",
  bad: "bg-red-100 text-red-700",
  muted: "bg-ink/5 text-ink/50",
};
const DOT: Record<BadgeTone, string> = {
  ok: "bg-sage",
  warn: "bg-clay",
  bad: "bg-red-500",
  muted: "bg-ink/40",
};

// Real availability for the couple's wedding date. Without a date there is
// nothing to say, except that some items are made to order.
export default function AvailabilityBadge({
  availability,
  madeToOrder,
}: {
  availability?: ItemAvailability;
  madeToOrder: boolean;
}) {
  const info = availability
    ? availabilityLabel(availability)
    : madeToOrder
      ? { label: "Made to order", tone: "muted" as BadgeTone }
      : null;
  if (!info) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[info.tone]}`}
      title="Checked against what the supplier has free on your wedding date"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[info.tone]}`} />
      {info.label}
    </span>
  );
}
