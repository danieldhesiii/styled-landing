import { stockInfo } from "@/lib/stock";
import type { StockStatus } from "@/lib/types";

const TONE: Record<string, string> = {
  ok: "bg-sage/15 text-sage",
  warn: "bg-clay/15 text-clay",
  muted: "bg-ink/5 text-ink/50",
};

const DOT: Record<string, string> = {
  ok: "bg-sage",
  warn: "bg-clay",
  muted: "bg-ink/40",
};

export default function StockBadge({ status }: { status: StockStatus }) {
  const info = stockInfo(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[info.tone]}`}
      title="Live availability (placeholder — vendor stock feed to be connected)"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[info.tone]}`} />
      {info.label}
    </span>
  );
}
