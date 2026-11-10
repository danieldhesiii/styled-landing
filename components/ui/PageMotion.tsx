"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Animate route content without remounting forms or delaying navigation. */
export default function PageMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const content = document.querySelector("main");
    const animation = content?.animate(
      [{ opacity: 0.65, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }],
      { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" },
    );
    return () => animation?.cancel();
  }, [pathname]);
  return null;
}
