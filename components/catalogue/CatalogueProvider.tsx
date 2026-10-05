"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogueItem, Category } from "@/lib/types";

// Loads the live catalogue from /api/catalogue once and shares it with everything
// under /design. Replaces importing the catalogue from a code file: prices and
// availability now come from the database. Children render once it has loaded,
// so no component ever shows a price that's about to change.

interface CatalogueContextValue {
  items: CatalogueItem[];
  getItem: (id: string) => CatalogueItem | undefined;
  itemsForCategory: (category: Category) => CatalogueItem[];
  refresh: () => Promise<void>;
}

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

export function useCatalogue(): CatalogueContextValue {
  const ctx = useContext(CatalogueContext);
  if (!ctx) throw new Error("useCatalogue must be used inside <CatalogueProvider>.");
  return ctx;
}

export default function CatalogueProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CatalogueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogue", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Couldn't load the catalogue.");
      setItems(data.items as CatalogueItem[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the catalogue.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<CatalogueContextValue | null>(() => {
    if (!items) return null;
    const byId = new Map(items.map((i) => [i.id, i]));
    return {
      items,
      getItem: (id) => byId.get(id),
      itemsForCategory: (category) => items.filter((i) => i.category === category),
      refresh: load,
    };
  }, [items, load]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6 text-center">
        {error ? (
          <div>
            <p className="text-sm text-ink/60">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                load();
              }}
              className="mt-4 rounded-full bg-ink px-5 py-2 text-sm text-cream hover:bg-ink/90"
            >
              Try again
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink/40">Loading the catalogue…</p>
        )}
      </div>
    );
  }

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}
