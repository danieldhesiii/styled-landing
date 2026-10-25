"use client";

import { exclusionText, type LookReport } from "@/lib/look";
import { categoryMeta } from "@/lib/categories";
import { formatGBP } from "@/lib/quote";

// "What's in this picture": exactly the catalogue pieces the render was built
// from, which the couple can go on to order; plus anything that was left out or
// swapped because it isn't available for their date. This is the promise behind
// the image: nothing in it is something they can't buy.
export default function LookReportPanel({
  look,
  weddingDate,
  onWeddingDate,
}: {
  look: LookReport;
  weddingDate: string;
  onWeddingDate: (date: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const substitutions = look.excluded.filter((e) => e.substituteId);
  const leftOut = look.excluded.filter((e) => !e.substituteId);

  return (
    <section aria-label="What's in this picture" className="border-t border-sand bg-cream/40 px-4 py-3">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs text-ink/70 [&::-webkit-details-marker]:hidden">
          <span>{look.items.length} catalogue references{look.excluded.length ? ` · ${look.excluded.length} changes` : ""}</span>
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </summary>

      {!look.checked && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-clay/10 px-3 py-2 text-[11px] text-ink/70">
          <span className="flex-1">
            Add your event date to check stock when generating. Availability and delivery still need supplier confirmation before booking.
          </span>
          <input
            type="date"
            aria-label="Event date"
            min={today}
            value={weddingDate}
            onChange={(e) => onWeddingDate(e.target.value)}
            className="rounded-lg border border-sand bg-white px-2 py-1 text-[11px] text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
          />
        </div>
      )}

      {look.items.length > 0 && (
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {look.items.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border border-sand bg-white px-2.5 py-1.5">
              {i.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.image} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
              ) : (
                <span className="h-8 w-8 shrink-0 rounded bg-sand" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium text-ink">{i.name}</span>
                <span className="block truncate text-[10px] text-ink/45">
                  {i.supplier} · {i.quantity} × {formatGBP(i.unitPricePence / 100)}
                </span>
              </span>
              {i.source === "substitute" && (
                <span className="shrink-0 rounded-full bg-sand px-1.5 py-0.5 text-[9px] text-ink/60">swapped in</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {substitutions.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] text-ink/60">
          {substitutions.map((e) => (
            <li key={e.itemId}>
              <span className="font-medium text-ink/75">{e.name}</span> {exclusionText(e)}, so we used{" "}
              <span className="font-medium text-ink/75">{e.substituteName}</span> instead.
            </li>
          ))}
        </ul>
      )}

      {leftOut.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] text-ink/60">
          {leftOut.map((e) => (
            <li key={e.itemId}>
              <span className="font-medium text-ink/75">{e.name}</span> {exclusionText(e)}, so it&apos;s left out.
            </li>
          ))}
        </ul>
      )}

      {look.leftPlain.length > 0 && (
        <p className="mt-2 text-[11px] text-ink/50">
          Left plain, because nothing is available for it:{" "}
          {look.leftPlain.map((c) => categoryMeta(c).label.toLowerCase()).join(", ")}.
        </p>
      )}
      </details>
    </section>
  );
}
