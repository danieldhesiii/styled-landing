"use client";

import HelpButton from "@/components/help/HelpButton";
import { useEffect, useState } from "react";

import BoardPicker, {
  type BoardPickerProps,
} from "@/components/wedding/BoardPicker";

export interface SavedLook {
  id: string;
  styleId: string;
  styleName: string;
  /** The original venue/room photo this look was styled from, for before/after. */
  originalUrl?: string;
  savedAt: number;
}

interface Props extends BoardPickerProps {
  busyIds?: Set<string>;
  error?: string;
  embedded?: boolean;
  looks: SavedLook[];
  onClose: () => void;
  onCreate?: () => void;
  onLoad: (look: SavedLook, url: string, itemIds?: string[]) => void;
  onUnsave: (id: string) => void;
}

export default function SavedLooks({
  boards,
  boardsBusy,
  onAddToBoard,
  busyIds,
  error,
  embedded = false,
  looks,
  onClose,
  onCreate,
  onLoad,
  onUnsave,
}: Props) {
  // Signed URLs expire, so fetch a fresh one per saved render on open — for both
  // the styled render ("after") and the original venue photo ("before").
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [originalUrls, setOriginalUrls] = useState<Record<string, string>>({});
  const [itemIdsById, setItemIdsById] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  // Which cards are currently showing their "before" (original) image.
  const [comparing, setComparing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const next: Record<string, string | null> = {};
      const nextOriginals: Record<string, string> = {};
      const nextItems: Record<string, string[]> = {};
      await Promise.all(
        looks.map(async (l) => {
          try {
            const data = await (await fetch(`/api/renders/${l.id}`)).json();
            next[l.id] =
              data?.status === "succeeded" && data.imageUrl
                ? data.imageUrl
                : null;
            // Prefer the freshly-signed original; fall back to anything stored.
            const original = data?.originalUrl ?? l.originalUrl;
            if (original) nextOriginals[l.id] = original;
            if (Array.isArray(data?.itemIds)) nextItems[l.id] = data.itemIds;
          } catch {
            next[l.id] = null;
            if (l.originalUrl) nextOriginals[l.id] = l.originalUrl;
          }
        }),
      );
      if (!cancelled) {
        setUrls(next);
        setOriginalUrls(nextOriginals);
        setItemIdsById(nextItems);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [looks]);

  return (
    <section
      aria-label="Saved looks"
      className={
        embedded
          ? ""
          : "overflow-hidden rounded-2xl border border-sand bg-white"
      }
    >
      {!embedded && (
        <div className="flex items-center justify-between border-b border-sand px-6 py-4">
          <div>
            <h1 className="font-serif text-4xl text-ink">Saved looks</h1>
            <p className="mt-3 max-w-2xl text-sm text-ink/60">
              Your saved AI previews. Open a look to explore its catalogue
              pieces in the visualiser. Saving a look does not add anything to
              your basket.
            </p>
            <p className="mt-0.5 text-xs text-ink/50">
              {looks.length === 0
                ? "Nothing saved yet"
                : `${looks.length} saved`}
            </p>
          </div>
          <HelpButton
            topic="saved"
            className="ml-auto mr-3 rounded-full border border-sand px-3 py-2 text-xs"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="px-6 pt-4 text-sm text-clay">
          {error}
        </p>
      )}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {looks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-clay/40 text-2xl text-clay/50">
              ♥
            </div>
            <p className="max-w-xs text-sm text-ink/50">
              When you generate a look you love, tap{" "}
              <span className="text-clay">♥ Save</span> on the image and it'll
              be kept here so you can come back to it.
            </p>
            {onCreate && <button type="button" onClick={onCreate} className="mt-2 min-h-11 rounded-full bg-ink px-5 py-2 text-sm text-cream">Open Visualise</button>}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {looks.map((l) => {
              const url = urls[l.id];
              const original = originalUrls[l.id];
              const showingBefore = !!comparing[l.id] && !!original;
              return (
                <div
                  key={l.id}
                  className="overflow-hidden rounded-xl border border-sand bg-white shadow-sm"
                >
                  <div className="relative aspect-[4/3] w-full bg-sand/40">
                    <button
                      type="button"
                      onClick={() => url && onLoad(l, url, itemIdsById[l.id])}
                      disabled={!url}
                      className="block h-full w-full disabled:cursor-not-allowed"
                      aria-label={`Open ${l.styleName} in the studio`}
                    >
                      {url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={showingBefore ? original : url}
                            alt={l.styleName}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/55 px-2 py-0.5 text-[9px] text-cream backdrop-blur-sm">
                            {showingBefore ? "Before" : "After"}
                          </span>
                        </>
                      ) : (
                        <span className="flex h-full items-center justify-center text-[11px] text-ink/40">
                          {loading ? "Loading…" : "Unavailable"}
                        </span>
                      )}
                    </button>
                    {/* Before/after toggle — only if we have the original. */}
                    {url && original && (
                      <button
                        type="button"
                        aria-pressed={showingBefore}
                        onClick={() =>
                          setComparing((c) => ({ ...c, [l.id]: !c[l.id] }))
                        }
                        className="absolute bottom-1.5 right-1.5 min-h-11 rounded-full border border-white/40 bg-ink/75 px-3 text-xs text-cream"
                      >
                        {showingBefore ? "See after" : "See before"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">
                        {l.styleName}
                      </p>
                      <p className="text-[10px] text-ink/40">
                        {new Date(l.savedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyIds?.has(l.id)}
                      onClick={() => onUnsave(l.id)}
                      aria-label={
                        busyIds?.has(l.id)
                          ? `Removing ${l.styleName} from saved`
                          : `Remove ${l.styleName} from saved`
                      }
                      title="Remove from saved"
                      className="min-h-11 min-w-11 shrink-0 text-ink/30 hover:text-clay transition-colors disabled:opacity-50"
                    >
                      {busyIds?.has(l.id) ? "…" : "×"}
                    </button>
                  </div>
                  <div className="px-3 pb-3">
                    <p className="text-xs text-ink/60">
                      Illustrative AI preview. Exact appearance is not
                      guaranteed.
                    </p>
                    <BoardPicker
                      boards={boards}
                      boardsBusy={boardsBusy}
                      onAddToBoard={onAddToBoard}
                      target={{ kind: "look", ref: l.id, text: l.styleName }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!embedded && (
        <div className="border-t border-sand px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 transition-colors"
          >
            Browse catalogue
          </button>
        </div>
      )}
    </section>
  );
}
