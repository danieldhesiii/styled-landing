"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useSavedItems() {
  const client = useMemo(() => createClient(), []);
  const [ids, setIds] = useState<string[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<Set<string>>(new Set());
  const owner = useRef<string | null>(null),
    generation = useRef(0),
    locks = useRef(new Set<string>());
  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    setLoaded(false);
    setError("");
    try {
      const { data: auth, error: authError } = await client.auth.getUser();
      if (revision !== generation.current) return;
      if (authError || !auth.user) {
        owner.current = null;
        setIds([]);
        throw Error("Sign in to save your favourite pieces.");
      }
      if (owner.current !== auth.user.id) setIds([]);
      owner.current = auth.user.id;
      const { data, error: readError } = await client
        .from("saved_items")
        .select("product_id")
        .eq("owner_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (revision !== generation.current) return;
      if (readError)
        throw Error("We couldn’t load your saved items. Please try again.");
      setIds((data || []).map((row) => row.product_id));
      setLoaded(true);
    } catch (e) {
      if (revision === generation.current)
        setError(
          e instanceof Error ? e.message : "Could not load saved items.",
        );
    }
  }, [client]);
  useEffect(() => {
    void refresh();
    const { data: listener } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        ++generation.current;
        owner.current = null;
        setIds([]);
        setLoaded(false);
      }
      if (event === "SIGNED_IN")
        setTimeout(() => {
          if (!locks.current.size) void refresh();
        }, 0);
    });
    return () => {
      ++generation.current;
      listener.subscription.unsubscribe();
    };
  }, [client, refresh]);
  async function toggle(productId: string) {
    if (!loaded || !owner.current || locks.current.has(productId)) return;
    const userId = owner.current,
      revision = generation.current,
      wasSaved = ids.includes(productId);
    locks.current.add(productId);
    setBusy(new Set(locks.current));
    setError("");
    try {
      const result = wasSaved
        ? await client
            .from("saved_items")
            .delete()
            .eq("owner_id", userId)
            .eq("product_id", productId)
        : await client
            .from("saved_items")
            .insert({ owner_id: userId, product_id: productId });
      if (result.error && !(result.error.code === "23505" && !wasSaved))
        throw Error("Your saved items could not be updated. Please try again.");
      if (owner.current === userId && generation.current === revision)
        setIds((old) =>
          wasSaved
            ? old.filter((id) => id !== productId)
            : [productId, ...old.filter((id) => id !== productId)],
        );
    } catch (e) {
      if (owner.current === userId)
        setError(e instanceof Error ? e.message : "Could not save this item.");
    } finally {
      locks.current.delete(productId);
      setBusy(new Set(locks.current));
    }
  }
  return { ids, loaded, error, busy, toggle, refresh };
}
