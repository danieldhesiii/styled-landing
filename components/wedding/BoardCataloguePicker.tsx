"use client";
import { useState } from "react";
import type { CatalogueItem } from "@/lib/types";
import { formatGBP } from "@/lib/quote";
import { imageDisclosure } from "@/lib/shopping";
export default function BoardCataloguePicker({
  items,
  savedIds,
  pinnedIds,
  disabled,
  onPick,
}: {
  items: CatalogueItem[];
  savedIds: string[];
  pinnedIds: string[];
  disabled: boolean;
  onPick: (id: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const filtered = items
    .filter(
      (item) =>
        (!savedOnly || savedIds.includes(item.id)) &&
        `${item.name} ${item.supplier}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(savedIds.includes(b.id)) - Number(savedIds.includes(a.id)),
    );
  return (
    <section
      aria-label="Choose catalogue pieces"
      className="min-w-0 sm:col-span-2"
    >
      <h3 className="text-sm">Add catalogue pieces</h3>
      <div className="mt-3 flex gap-2">
        <input
          type="search"
          aria-label="Search pieces for this board"
          placeholder="Search pieces or suppliers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-sand px-3 text-sm"
        />
        <button
          type="button"
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly(!savedOnly)}
          className="rounded-full border border-sand px-3 text-xs"
        >
          Favourites
        </button>
      </div>
      <p role="status" className="my-3 text-xs text-ink/60">
        {filtered.length} pieces
        {!filtered.length ? ". Try another search or turn off Favourites." : ""}
      </p>
      <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-auto sm:grid-cols-3">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled || pending || pinnedIds.includes(item.id)}
            onClick={async () => {
              setPending(true);
              setMessage("");
              try {
                setMessage(
                  (await onPick(item.id))
                    ? `${item.name} added to board`
                    : "Could not save piece. Try again.",
                );
              } catch {
                setMessage("Could not save piece. Try again.");
              } finally {
                setPending(false);
              }
            }}
            className="overflow-hidden rounded-xl border border-sand text-left disabled:opacity-50"
          >
            {item.image ? (
              <img
                src={item.image}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <span className="flex aspect-[4/3] items-center justify-center bg-cream text-3xl">
                {item.icon}
              </span>
            )}
            <span className="block p-3 text-xs">
              <span className="block font-medium">{item.name}</span>
              <span className="mt-1 block text-ink/60">{item.supplier}</span>
              <span className="mt-1 block">
                {formatGBP(item.unitPrice)} {item.unit}
              </span>
              <span className="mt-1 block text-ink/60">
                {imageDisclosure(item)}
              </span>
              <span className="mt-2 block text-clay">
                {pinnedIds.includes(item.id)
                  ? "Already added"
                  : "Add to board +"}
              </span>
            </span>
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="mt-3 text-xs text-clay">
          {message}
        </p>
      )}
    </section>
  );
}
