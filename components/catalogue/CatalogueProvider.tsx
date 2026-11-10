"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import type { CatalogueItem, Category } from "@/lib/types";

// Loads the live catalogue from /api/catalogue once and shares it with everything
// under /design. Replaces importing the catalogue from a code file: prices and
// availability now come from the database. Non-shopping sections stay available
// during loading or failure; purchase controls check the loading/error state.

export type VenueScope={slug:string;name:string;policy:import("@/lib/venue-suppliers").VenueSupplierPolicy};
interface CatalogueContextValue {
  setVenueScope:(slug:string)=>void;
  scope:VenueScope|null;
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
  const [venueSlug,setVenueSlug]=useState("");
  const [scope,setScope]=useState<VenueScope|null>(null);
  const sequence=useRef(0);
  const currentSlug=useRef("");
  const setVenueScope=useCallback((slug:string)=>{if(currentSlug.current===slug)return;currentSlug.current=slug;sequence.current++;setItems(null);setScope(null);setLoading(true);setVenueSlug(slug);},[]);
  const [items, setItems] = useState<CatalogueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const request=++sequence.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/catalogue${venueSlug?`?venue=${encodeURIComponent(venueSlug)}`:""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? "Couldn't load the catalogue.");
      if(request!==sequence.current)return;
      setScope(data.scope||null);
      setItems([...(data.items as CatalogueItem[]), ...((data.demoItems ?? []) as CatalogueItem[])]);
      setError(null);
    } catch (err) {
      if(request!==sequence.current)return;
      setItems(null);setScope(null);
      setError(
        err instanceof Error ? err.message : "Couldn't load the catalogue.",
      );
    } finally {
      if(request===sequence.current)setLoading(false);
    }
  }, [venueSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<CatalogueContextValue>(() => {
    const available = items || [];
    const byId = new Map(available.map((item) => [item.id, item]));
    return {
      scope,setVenueScope,
      items: available,
      getItem: (id) => byId.get(id),
      itemsForCategory: (category) =>
        available.filter((item) => item.category === category),
      refresh: load,
      loading,
      error,
    };
  }, [items, load, loading, error,scope,setVenueScope]);

  return (
    <CatalogueContext.Provider value={value}>
      {children}
    </CatalogueContext.Provider>
  );
}
