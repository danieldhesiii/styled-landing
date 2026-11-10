"use client";
import useOutsideClick from "@/components/ui/useOutsideClick";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/venues", label: "Venues" },
  { href: "/suppliers", label: "Suppliers" },
];
const linkStyle = "inline-flex min-h-11 items-center text-sm underline-offset-8 hover:underline motion-safe:transition-colors motion-safe:duration-200";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useOutsideClick<HTMLElement>(open, () => setOpen(false));
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const current = (href: string) => {
    if (pathname.startsWith("/venues/partner") || pathname === "/suppliers/join") return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header ref={header} onKeyDown={event => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }} className="sticky top-0 z-30 border-b border-sand bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-3 sm:py-4">
        <Link href="/" aria-label="Styled home" className="inline-flex min-h-11 shrink-0 items-center font-serif text-3xl tracking-tight text-ink">
          Styled<span className="text-clay">.</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map(link => <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined}
            className={`${linkStyle} ${current(link.href) ? "text-ink underline decoration-clay" : "text-ink/70"}`}>{link.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <Link href="/business" className={`${linkStyle} hidden text-ink/70 lg:inline-flex`}>For businesses</Link>
          <Link href="/login?mode=login" className={`${linkStyle} text-ink/70`}>Log in</Link>
          <Link href="/design?tab=wedding" className="hidden min-h-11 items-center rounded-full bg-ink px-5 text-sm text-cream hover:bg-ink/90 motion-safe:transition-colors motion-safe:duration-200 lg:inline-flex">Start planning</Link>
          <button ref={toggle} type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"} className="inline-flex min-h-11 items-center gap-2 text-sm text-ink lg:hidden">
            {open ? "Close" : "Menu"}<span aria-hidden="true" className="text-lg">{open ? "−" : "+"}</span>
          </button>
        </div>
      </div>
      <nav id="mobile-menu" hidden={!open} aria-label="Mobile" className="border-t border-sand bg-cream px-5 pb-6 pt-2 motion-safe:animate-fade-in lg:hidden">
        <div className="mx-auto flex max-w-6xl flex-col">
          {NAV_LINKS.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
            aria-current={current(link.href) ? "page" : undefined} className="flex min-h-12 items-center justify-between border-b border-sand py-3 text-base text-ink">
            {link.label}<span aria-hidden="true">→</span>
          </Link>)}
          <Link href="/business" onClick={() => setOpen(false)} className={`${linkStyle} mt-2 text-ink/70`}>For businesses</Link>
          <Link href="/design?tab=wedding" onClick={() => setOpen(false)} className="mt-3 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm text-cream">Start planning</Link>
        </div>
      </nav>
    </header>
  );
}
