"use client";

import { useEffect, useState } from "react";
import type { BasketLine } from "@/lib/types";
import type { ItemAvailability } from "@/lib/availability";

// What's free on the couple's wedding date. Two views of the same database rule:
//   useShopAvailability  every product, at the quantity a wedding of this size
//                        would normally order (for the badges in the shop)
//   useBasketAvailability  just the basket, at the quantities chosen (basket, checkout)
// Both stay empty until there is a real date today or later.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const usable = (date: string) =>
  DAY.test(date) && date >= new Date().toISOString().slice(0, 10);

export interface ShopAvailability {
  items: Record<string, ItemAvailability> | null;
  loading: boolean;
  error: string | null;
}

export function useShopAvailability(
  date: string,
  guests: number,
  delivery = date,
  returnDate = date,
): ShopAvailability {
  const [state, setState] = useState<ShopAvailability>({
    items: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!usable(date) || !usable(delivery)) {
      setState({ items: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ items: null, loading: true, error: null });
    fetch(
      `/api/availability?date=${date}&guests=${guests}&delivery=${encodeURIComponent(delivery)}&returnDate=${encodeURIComponent(returnDate)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d?.ok)
          setState({
            items: null,
            loading: false,
            error: d?.error ?? "Couldn't check availability.",
          });
        else setState({ items: d.items, loading: false, error: null });
      })
      .catch(
        () =>
          !cancelled &&
          setState({
            items: null,
            loading: false,
            error: "Couldn't check availability.",
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [date, guests, delivery, returnDate]);

  return state;
}

export interface BasketAvailability {
  lines: Record<string, ItemAvailability>;
  allAvailable: boolean;
  loading: boolean;
  error: string | null;
  checked: boolean; // a real answer for the current date and basket
}

export function useBasketAvailability(
  date: string,
  basket: BasketLine[],
  refreshKey = 0,
  delivery = date,
  returnDate = date,
): BasketAvailability {
  const [state, setState] = useState<BasketAvailability>({
    lines: {},
    allAvailable: true,
    loading: false,
    error: null,
    checked: false,
  });
  const key = JSON.stringify(basket.map((l) => [l.itemId, l.quantity, l.hireDates]));

  useEffect(() => {
    if (!usable(date) || !usable(delivery) || basket.length === 0) {
      setState({
        lines: {},
        allAvailable: true,
        loading: false,
        error: null,
        checked: false,
      });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null, checked: false }));
    // Wait for the quantity stepper to settle before asking.
    const timer = setTimeout(() => {
      fetch("/api/availability/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, basket, delivery, returnDate, itemDates: Object.fromEntries(basket.filter(l => l.hireDates).map(l => [l.itemId, l.hireDates])) }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (!d?.ok)
            setState({
              lines: {},
              allAvailable: true,
              loading: false,
              error: d?.error ?? "Couldn't check availability.",
              checked: false,
            });
          else
            setState({
              lines: d.lines,
              allAvailable: d.allAvailable,
              loading: false,
              error: null,
              checked: true,
            });
        })
        .catch(
          () =>
            !cancelled &&
            setState({
              lines: {},
              allAvailable: true,
              loading: false,
              error: "Couldn't check availability.",
              checked: false,
            }),
        );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, key, refreshKey, delivery, returnDate]);

  return state;
}
