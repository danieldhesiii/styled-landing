"use client";

import { useEffect, useState } from "react";
import type { BasketLine } from "@/lib/types";
import type { ItemAvailability } from "@/lib/availability";

// What's free on the couple's wedding date. Two views of the same database rule:
//   useShopAvailability  every product, at the quantity a wedding of this size
//                        would normally order (for the badges in the shop)
//   useBasketAvailability  just the basket, at the quantities chosen (basket, checkout).
//                        It also HOLDS the basket on the server, so other couples
//                        can't take what's in it while the studio is open.
// Both stay empty until there is a real date today or later, and both re-check
// every minute while the page is in view, so stock other couples take or release
// shows up without a reload.

// Basket holds lapse after 15 minutes without a sync (see set_basket_holds).
const RESYNC_MS = 60_000;

// Run fn every RESYNC_MS while the page is visible, and as soon as it's shown again.
function whileVisible(fn: () => void): () => void {
  const interval = setInterval(() => document.visibilityState === "visible" && fn(), RESYNC_MS);
  const onShow = () => document.visibilityState === "visible" && fn();
  document.addEventListener("visibilitychange", onShow);
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onShow);
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const usable = (date: string) => DAY.test(date) && date >= new Date().toISOString().slice(0, 10);

export interface ShopAvailability {
  items: Record<string, ItemAvailability> | null;
  loading: boolean;
  error: string | null;
}

export function useShopAvailability(date: string, guests: number): ShopAvailability {
  const [state, setState] = useState<ShopAvailability>({ items: null, loading: false, error: null });

  useEffect(() => {
    if (!usable(date)) {
      setState({ items: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    // Quiet re-checks keep showing the last answer while they run, and on failure.
    const load = (quiet: boolean) => {
      if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
      fetch(`/api/availability?date=${date}&guests=${guests}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (d?.ok) setState({ items: d.items, loading: false, error: null });
          else if (!quiet) setState({ items: null, loading: false, error: d?.error ?? "Couldn't check availability." });
        })
        .catch(() => !cancelled && !quiet && setState({ items: null, loading: false, error: "Couldn't check availability." }));
    };
    load(false);
    const stop = whileVisible(() => load(true));
    return () => {
      cancelled = true;
      stop();
    };
  }, [date, guests]);

  return state;
}

export interface BasketAvailability {
  lines: Record<string, ItemAvailability>;
  allAvailable: boolean;
  loading: boolean;
  error: string | null;
  checked: boolean; // a real answer for the current date and basket
}

export function useBasketAvailability(date: string, basket: BasketLine[], refreshKey = 0): BasketAvailability {
  const [state, setState] = useState<BasketAvailability>({ lines: {}, allAvailable: true, loading: false, error: null, checked: false });
  const key = JSON.stringify(basket.map((l) => [l.itemId, l.quantity]));

  useEffect(() => {
    const active = usable(date) && basket.length > 0;
    let cancelled = false;
    if (active) setState((s) => ({ ...s, loading: true, error: null, checked: false }));
    else setState({ lines: {}, allAvailable: true, loading: false, error: null, checked: false });

    // Hold this basket on the server (or, with no date or nothing in it, release
    // whatever it held) and get back what's available. Quiet re-syncs renew the
    // hold and keep showing the last answer while they run, and on failure.
    const sync = (quiet: boolean) => {
      fetch("/api/basket/holds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(active ? { date, basket } : { date: null, basket: [] }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !active) return;
          if (d?.ok) setState({ lines: d.lines, allAvailable: d.allAvailable, loading: false, error: null, checked: true });
          else if (!quiet) setState({ lines: {}, allAvailable: true, loading: false, error: d?.error ?? "Couldn't check availability.", checked: false });
        })
        .catch(() => !cancelled && active && !quiet && setState({ lines: {}, allAvailable: true, loading: false, error: "Couldn't check availability.", checked: false }));
    };
    // Wait for the quantity stepper to settle before asking.
    const timer = setTimeout(() => sync(false), 350);
    const stop = active ? whileVisible(() => sync(true)) : () => {};
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, key, refreshKey]);

  return state;
}
