import Link from "next/link";
import type { ReactNode } from "react";

export default function InformationPage({ title, intro, links, children }: {
  title: string;
  intro: string;
  links: { href: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl break-words py-10 leading-relaxed text-ink/80 sm:py-14 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink [&_p+p]:mt-3 [&_section]:space-y-3">
      <header className="space-y-4">
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">{title}</h1>
        <p className="text-sm text-ink/70">Updated <time dateTime="2026-11-07">7 November 2026</time> · Version 2</p>
        <p>{intro}</p>
      </header>
      <nav aria-label={`On this page: ${title}`} className="my-8 flex flex-wrap gap-x-6 gap-y-1 border-y border-sand py-3 text-sm">
        {links.map(link => <a key={link.href} href={link.href} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-ink">{link.label}</a>)}
      </nav>
      <div className="space-y-9">{children}</div>
      <nav aria-label="Related service information" className="mt-10 flex flex-wrap gap-x-6 gap-y-1 border-t border-sand pt-4 text-sm">
        <Link href="/support" className="inline-flex min-h-11 items-center underline underline-offset-4">Help & support</Link>
        <Link href="/service-info" className="inline-flex min-h-11 items-center underline underline-offset-4">Service information</Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-4">Privacy policy</Link>
        <Link href="/terms" className="inline-flex min-h-11 items-center underline underline-offset-4">Service terms</Link>
      </nav>
    </article>
  );
}
