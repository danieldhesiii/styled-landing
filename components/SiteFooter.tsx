import Link from "next/link";

const sections = [
  { title: "Explore", links: [{ href: "/venues", label: "Venues" }, { href: "/suppliers", label: "Suppliers" }, { href: "/design?tab=wedding", label: "Your wedding plan" }] },
  { title: "Help", links: [{ href: "/support", label: "Contact support" }, { href: "/service-info", label: "How requests work" }] },
  { title: "For businesses", links: [{ href: "/venues/partner", label: "List a venue" }, { href: "/suppliers/join", label: "Become a supplier" }, { href: "/business", label: "Business workspaces" }] },
];
const linkStyle = "inline-flex min-h-11 items-center text-sm text-ink/70 underline-offset-4 hover:text-ink hover:underline motion-safe:transition-colors motion-safe:duration-200";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sand bg-cream sm:mt-24">
      <div className="mx-auto max-w-6xl px-5 pb-6 pt-10 sm:pt-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" aria-label="Styled home" className="inline-flex min-h-11 items-center font-serif text-3xl tracking-tight text-ink">Styled<span className="text-clay">.</span></Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/70">Your wedding, taking shape.</p>
          </div>
          {sections.map(section => <nav key={section.title} aria-label={`Footer ${section.title}`}>
            <h2 className="mb-2 text-sm font-medium text-ink">{section.title}</h2>
            <ul>{section.links.map(link => <li key={link.href}><Link href={link.href} className={linkStyle}>{link.label}</Link></li>)}</ul>
          </nav>)}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-sand pt-4">
          <p className="text-sm text-ink/60">Styled</p>
          <nav aria-label="Footer policies" className="flex flex-wrap gap-x-6">
            <Link href="/privacy" className={linkStyle}>Privacy policy</Link>
            <Link href="/terms" className={linkStyle}>Service terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
