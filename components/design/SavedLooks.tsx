"use client";

import { useEffect, useState } from "react";

export interface SavedLook {
  id: string;
  styleId: string;
  styleName: string;
  /** The original venue/room photo this look was styled from, for before/after. */
  originalUrl?: string;
  savedAt: number;
}

interface Props {
  looks: SavedLook[];
  onClose: () => void;
  onLoad: (look: SavedLook, url: string, itemIds?: string[]) => void;
  onUnsave: (id: string) => void;
}

export default function SavedLooks({ looks, onClose, onLoad, onUnsave }: Props) {
  // Signed URLs expire, so fetch a fresh one per saved render on open.
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [itemIdsById, setItemIdsById] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  // Which cards are currently showing their "before" (original) image.
  const [comparing, setComparing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string | null> = {};
      const nextItems: Record<string, string[]> = {};
      await Promise.all(
        looks.map(async (l) => {
          try {
            const data = await (await fetch(`/api/renders/${l.id}`)).json();
            next[l.id] = data?.status === "succeeded" && data.imageUrl ? data.imageUrl : null;
            if (Array.isArray(data?.itemIds)) nextItems[l.id] = data.itemIds;
          } catch {
            next[l.id] = null;
          }
        })
      );
      if (!cancelled) {
        setUrls(next);
        setItemIdsById(nextItems);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [looks]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-sand px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-ink">Saved looks</h2>
            <p className="mt-0.5 text-xs text-ink/50">
              {looks.length === 0 ? "Nothing saved yet" : `${looks.length} saved`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/40 hover:border-clay hover:text-ink transition-colors">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {looks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 pt-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-clay/40 text-2xl text-clay/50">
                ♥
              </div>
              <p className="max-w-xs text-sm text-ink/50">
                When you generate a look you love, tap <span className="text-clay">♥ Save</span> on the
                image and it'll be kept here so you can come back to it.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {looks.map((l) => {
                const url = urls[l.id];
                const showingBefore = !!comparing[l.id] && !!l.originalUrl;
                return (
                  <div key={l.id} className="overflow-hidden rounded-xl border border-sand bg-white shadow-sm">
                    <button type="button" onClick={() => url && onLoad(l, url, itemIdsById[l.id])} disabled={!url}
                      className="relative block aspect-[4/3] w-full bg-sand/40 disabled:cursor-not-allowed"
                      title="Open this look in the studio">
                      {url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={showingBefore ? l.originalUrl : url}
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
                      {/* Before/after toggle — only if we kept the original. */}
                      {url && l.originalUrl && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setComparing((c) => ({ ...c, [l.id]: !c[l.id] }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setComparing((c) => ({ ...c, [l.id]: !c[l.id] }));
                            }
                          }}
                          className="absolute bottom-1.5 right-1.5 cursor-pointer rounded-full border border-white/40 bg-ink/55 px-2 py-0.5 text-[9px] text-cream backdrop-blur-sm hover:bg-ink/75 transition-colors"
                        >
                          {showingBefore ? "See after" : "See before"}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink">{l.styleName}</p>
                        <p className="text-[10px] text-ink/40">
                          {new Date(l.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <button type="button" onClick={() => onUnsave(l.id)} aria-label="Remove from saved"
                        title="Remove from saved"
                        className="shrink-0 text-ink/30 hover:text-clay transition-colors">
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-sand px-6 py-4">
          <button type="button" onClick={onClose}
            className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 transition-colors">
            Done
          </button>
        </div>
      </aside>
    </>
  );
}
