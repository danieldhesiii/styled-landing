"use client";

import { useState } from "react";

const STYLES = [
  { label: "Garden Romance", src: "/img/renders/garden_romance.jpg" },
  { label: "Classic Elegance", src: "/img/renders/classic_elegance.jpg" },
  { label: "Modern Minimal", src: "/img/renders/modern_minimal.jpg" },
  { label: "Wildflower", src: "/img/renders/rustic_barn.jpg" },
];

export default function VisualizerPreview() {
  const [active, setActive] = useState(0);

  return (
    <div className="rounded-2xl border border-sand bg-white shadow-lg sm:rounded-3xl">
      {/* Side-by-side images */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4">
        {/* Venue */}
        <div className="relative overflow-hidden rounded-xl border border-sand">
          <div className="absolute left-2 top-2 z-10 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] text-cream">
            Your venue
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/venues/manor_orangery.png"
            alt="Venue photo"
            className="h-44 w-full object-cover sm:h-56 lg:h-64"
          />
        </div>

        {/* Styled result */}
        <div className="relative overflow-hidden rounded-xl border border-clay/30">
          <div className="absolute left-2 top-2 z-10 rounded-full bg-clay/80 px-2.5 py-1 text-[11px] text-cream">
            Your look
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active}
            src={STYLES[active].src}
            alt={STYLES[active].label}
            className="h-44 w-full animate-fade-in object-cover sm:h-52 lg:h-56"
          />
        </div>
      </div>

      {/* Style picker — wraps so all chips always visible */}
      <div className="border-t border-sand px-3 pb-4 pt-3 sm:px-4">
        <p className="mb-2 text-xs text-ink/40">Style</p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
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
