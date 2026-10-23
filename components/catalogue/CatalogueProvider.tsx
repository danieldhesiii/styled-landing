"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CatalogueItem, Category } from "@/lib/types";

// Loads the live catalogue from /api/catalogue once and shares it with everything
// under /design. Replaces importing the catalogue from a code file: prices and
// availability now come from the database. Non-shopping sections stay available
// during loading or failure; purchase controls check the loading/error state.

interface CatalogueContextValue {
  items: CatalogueItem[];
  getItem: (id: string) => CatalogueItem | undefined;
  itemsForCategory: (category: Category) => CatalogueItem[];
  refresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

export function useCatalogue(): CatalogueContextValue {
  const ctx = useContext(CatalogueContext);
  if (!ctx)
    throw new Error("useCatalogue must be used inside <CatalogueProvider>.");
  return ctx;
}

export default function CatalogueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CatalogueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/catalogue", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? "Couldn't load the catalogue.");
      setItems(data.items as CatalogueItem[]);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load the catalogue.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<CatalogueContextValue>(() => {
    const available = items || [];
    const byId = new Map(available.map((item) => [item.id, item]));
    return {
      items: available,
      getItem: (id) => byId.get(id),
      itemsForCategory: (category) =>
        available.filter((item) => item.category === category),
      refresh: load,
      loading,
      error,
    };
  }, [items, load, loading, error]);

  return (
    <CatalogueContext.Provider value={value}>
      {children}
    </CatalogueContext.Provider>
  );
}
