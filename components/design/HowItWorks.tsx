"use client";

import { useEffect } from "react";

const STEPS = [
  {
    n: "01",
    title: "Set your details",
    body: "Enter your guest count, budget, and wedding date using the bar at the top of the page. These can be updated at any time and your quote will adjust automatically.",
  },
  {
    n: "02",
    title: "Visualise your venue",
    body: "On the Visualise tab, upload your own venue photos or pick one of our sample rooms. Tell our AI stylist how you'd like the room to look — describe a stage, the table layout, a flower arch — and we'll generate a styled render around your brief. Once it's ready you can tweak that render with small changes (\"make the flowers blush pink\", \"add more candles\") or generate a whole new style — every version is saved side by side so you can compare.",
  },
  {
    n: "03",
    title: "Shop the look",
    body: "Switch to the Shop tab to browse everything you need across all 11 categories: florals, furniture, lighting, linen, attire, signage, bar hire, stationery, cake and more. Add items and your quote builds live on the right.",
  },
  {
    n: "04",
    title: "Review your quote",
    body: "The quote panel groups everything by supplier, shows your running total and tracks how much of your budget is left. Adjust quantities or remove anything as you go.",
  },
  {
    n: "05",
    title: "Reserve with a deposit",
    body: "When you're happy, click Reserve. We collect a 25% deposit to hold your items and confirm availability with each supplier. The rest is due closer to the date.",
  },
];

interface Props {
  onClose: () => void;
}

export default function HowItWorks({ onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cream shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-ink">How it works</h2>
            <p className="mt-0.5 text-xs text-ink/50">Five steps to your perfect day</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/40 hover:border-clay hover:text-ink transition-colors"
          >
            ×
          </button>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ol className="space-y-8">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-5">
                <span className="mt-0.5 shrink-0 font-serif text-2xl leading-none text-clay/50">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-serif text-lg text-ink">{s.title}</h3>
                  <div className="mt-1 h-px w-6 bg-clay/30" />
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-2xl border border-sand bg-white px-5 py-4">
            <p className="text-xs text-ink/50 leading-relaxed">
              <strong className="text-ink">Need help?</strong> Our team reviews every order before
              it's confirmed. If anything doesn't look right we'll be in touch before charging your
              card.
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-sand px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-ink py-3 text-sm font-medium text-cream hover:bg-ink/90 transition-colors"
          >
            Start designing
          </button>
        </div>
      </aside>
    </>
  );
}
