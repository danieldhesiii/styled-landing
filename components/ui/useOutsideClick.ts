"use client";

import { useEffect, useRef } from "react";

export default function useOutsideClick<T extends HTMLElement>(open: boolean, dismiss: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const panel = ref.current;
      const target = event.target;
      if (!panel || !(target instanceof Element) || panel.contains(target)) return;
      if (target.closest("dialog") !== panel.closest("dialog")) return;
      dismiss();
    };
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [open, dismiss]);
  return ref;
}
