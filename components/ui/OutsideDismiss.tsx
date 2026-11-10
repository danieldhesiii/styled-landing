"use client";

import { useEffect } from "react";

function backdrop(event: MouseEvent): HTMLDialogElement | null {
  const dialog = event.target;
  if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return null;
  const { left, right, top, bottom } = dialog.getBoundingClientRect();
  return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom
    ? dialog
    : null;
}

/** Backdrop clicks use the same cancellation path as Escape, including busy guards. */
export default function OutsideDismiss() {
  useEffect(() => {
    let pressed: HTMLDialogElement | null = null;
    const down = (event: PointerEvent) => {
      pressed = event.isPrimary && event.button === 0 ? backdrop(event) : null;
    };
    const click = (event: MouseEvent) => {
      const outside = backdrop(event);
      const startedOutside = outside && pressed === outside;
      pressed = null;
      if (startedOutside) {
        event.preventDefault();
        event.stopPropagation();
        if (outside.dispatchEvent(new Event("cancel", { cancelable: true }))) outside.close();
        return;
      }

      if (!(event.target instanceof Element)) return;
      const layer = event.target.closest("dialog");
      for (const trigger of event.isTrusted ? document.querySelectorAll<HTMLButtonElement>('button[aria-expanded="true"][aria-controls]') : []) {
        const id = trigger.getAttribute("aria-controls");
        const panel = id ? document.getElementById(id) : null;
        if (!panel || panel.hidden || panel.closest("dialog") !== layer) continue;
        if (!trigger.contains(event.target) && !panel.contains(event.target) && !trigger.disabled) trigger.click();
      }
      for (const disclosure of document.querySelectorAll<HTMLDetailsElement>("details[open]")) {
        if (disclosure.closest("dialog") === layer && !disclosure.contains(event.target)) disclosure.open = false;
      }
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("click", click, true);
    };
  }, []);
  return null;
}
