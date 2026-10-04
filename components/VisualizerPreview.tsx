"use client";

import { useState } from "react";

const STYLES = [
  { label: "Garden Romance", src: "/img/renders/garden_romance.jpg" },
  { label: "Classic Elegance", src: "/img/renders/classic_elegance.jpg" },
  { label: "Modern Minimal", src: "/img/renders/modern_minimal.jpg" },
  { label: "Rustic Barn", src: "/img/renders/rustic_barn.jpg" },
];

export default function VisualizerPreview() {
  const [active, setActive] = useState(0);

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm sm:rounded-3xl">
      {/* faux browser chrome — hidden on very small screens */}
      <div className="hidden items-center gap-1.5 border-b border-sand bg-cream px-4 py-3 sm:flex">
        <span className="h-2.5 w-2.5 rounded-full bg-blush" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-sand" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-sage/60" aria-hidden />
        <span className="mx-auto font-sans text-xs text-ink/30">styled.co/design</span>
      </div>

      {/* Side-by-side images */}
      <div className="grid grid-cols-2 gap-1.5 p-2 sm:gap-2 sm:p-3">
        {/* Venue */}
        <div className="relative overflow-hidden rounded-xl border border-sand">
          <div className="absolute left-2 top-2 z-10 rounded-full bg-ink/60 px-2 py-0.5 text-[10px] text-cream">
            Your venue
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/venues/manor_orangery.png"
            alt="Venue photo"
            className="h-36 w-full object-cover sm:h-44"
          />
        </div>

        {/* Styled result — swaps on chip click */}
        <div className="relative overflow-hidden rounded-xl border border-clay/30">
          <div className="absolute left-2 top-2 z-10 rounded-full bg-clay/80 px-2 py-0.5 text-[10px] text-cream">
            Your look
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active}
            src={STYLES[active].src}
            alt={STYLES[active].label}
            className="h-36 w-full animate-fade-in object-cover sm:h-44"
          />
        </div>
      </div>

      {/* Style picker */}
      <div className="border-t border-sand px-2 pb-2 pt-2 sm:px-3 sm:pb-3">
        <p className="mb-1.5 text-[10px] text-ink/40 sm:text-[11px]">Style</p>
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {STYLES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors sm:px-3 sm:text-xs ${
                i === active
                  ? "border-clay bg-clay text-cream"
                  : "border-sand text-ink/60 hover:border-clay/50 hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
