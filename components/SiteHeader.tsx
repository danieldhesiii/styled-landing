"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#faq", label: "FAQ" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-serif text-2xl tracking-wide text-ink">
          Styled<span className="text-clay">.</span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-ink/70 hover:text-ink">
              {l.label}
            </a>
          ))}
          <a href="/#cta" className="text-ink/70 hover:text-ink">
            For vendors
          </a>
          <a
            href="/#cta"
            className="rounded-full bg-ink px-4 py-2 text-cream hover:bg-ink/90"
          >
            Get started
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand text-ink md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            {open ? (
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="border-t border-sand bg-cream/95 px-5 py-4 md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-ink/80 hover:bg-sand/60 hover:text-ink"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/#cta"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-ink/80 hover:bg-sand/60 hover:text-ink"
            >
              For vendors
            </a>
            <a
              href="/#cta"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-full bg-ink px-4 py-3 text-center text-cream hover:bg-ink/90"
            >
              Get started
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
