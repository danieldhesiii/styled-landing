import Link from "next/link";

/* ------------------------------------------------------------------ *
 * Styled — public marketing landing page.
 *
 * Design language is carried over from the planner app:
 *   fonts  → serif "Cormorant Garamond", sans "Inter"  (tailwind.config.ts)
 *   colour → ink/cream/sand/clay/sage/blush/gold        (tailwind.config.ts)
 *   shapes → rounded-full buttons, rounded-2xl/3xl cards, border-sand
 * Every feature described below is actually present in the workspace.
 * All CTAs point at /login, which handles both sign-in and account creation.
 * ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: "🎨",
    title: "Design & AI renders",
    body: "Style each wedding, generate a photoreal render of the look, then turn it into a costed, supplier-ready plan.",
  },
  {
    icon: "💷",
    title: "Budget by supplier",
    body: "Every item priced and grouped by supplier, with deposits and what's left against the couple's budget.",
  },
  {
    icon: "🗓️",
    title: "Timeline & checklist",
    body: "A wedding-year checklist generated from the date, grouped into stages so nothing slips through.",
  },
  {
    icon: "👥",
    title: "Guest list",
    body: "Households, RSVPs, dietary needs and plus-ones — import an existing list from a CSV in seconds.",
  },
  {
    icon: "🪑",
    title: "Interactive seating",
    body: "Lay out the room to scale, choose table shapes, drag them where you want, and seat guests by name.",
  },
  {
    icon: "💌",
    title: "Couple collaboration",
    body: "Share a private link so couples can add a vision board, leave feedback and approve the look — no account needed.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Create a wedding",
    body: "Add a client with their date, venue, guest count and budget — or import your existing clients from a CSV.",
  },
  {
    n: "2",
    title: "Design & plan",
    body: "Style the day, build the costed plan, and work through the timeline, guest list and seating in one place.",
  },
  {
    n: "3",
    title: "Share with the couple",
    body: "Send a private link so they can add their vision and approve the look. They never need to create an account.",
  },
];

const FAQS = [
  {
    q: "What is Styled?",
    a: "A workspace for wedding planners to design, cost and organise each wedding in one place — design and renders, budget, timeline, guest list and seating.",
  },
  {
    q: "Who is it for?",
    a: "Wedding planners and stylists managing one or more weddings who want design and planning together, rather than spread across separate tools.",
  },
  {
    q: "Do couples need an account?",
    a: "No. You share a private link and they can add a vision board, leave comments and approve the look without signing up.",
  },
  {
    q: "Can I bring my existing clients and guest lists?",
    a: "Yes. You can import guest lists from a CSV exported from your current tool, so you don't have to retype them.",
  },
  {
    q: "Is it ready to use?",
    a: "It's an early release. Create an account to open the workspace and start building a wedding.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-block rounded-full border border-sand bg-sand/50 px-3 py-1 text-xs uppercase tracking-wide text-ink/60">
            For wedding planners
          </span>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">
            Every wedding, beautifully organised — in one place.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink/70">
            Styled is the planning &amp; design workspace for wedding planners.
            Design the day with AI renders, build a costed supplier plan, run the
            timeline, guest list and seating — and share it all with your couples.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/#cta"
              className="rounded-full bg-ink px-6 py-3 text-cream hover:bg-ink/90"
            >
              Get started
            </Link>
            <a
              href="#how"
              className="rounded-full border border-ink/20 px-6 py-3 text-ink hover:border-ink/40"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-sm text-ink/50">
            Design, budget, timeline, guests and seating — together for every client.
          </p>
        </div>

        <HeroPreview />
      </section>

      {/* -------------------------------------------------- Value prop */}
      <section className="rounded-3xl border border-sand bg-white/50 px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">
            Stop juggling ten tools for one wedding.
          </h2>
          <p className="mt-4 text-ink/70">
            Mood boards in one app, budgets in a spreadsheet, seating in another,
            and endless email threads with the couple. Styled brings design and
            planning into a single workspace per wedding — and lets couples
            collaborate without the back-and-forth.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            ["One workspace per client", "Everything for a wedding lives in one place."],
            ["Design that becomes a plan", "A render turns into a costed supplier list."],
            ["Couples collaborate by link", "No accounts, no chasing email threads."],
          ].map(([t, d]) => (
            <div
              key={t}
              className="rounded-2xl border border-sand bg-cream px-5 py-5 text-center"
            >
              <p className="font-serif text-xl text-ink">{t}</p>
              <p className="mt-1 text-sm text-ink/60">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- Features */}
      <section id="features" className="py-16">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">
            Everything a wedding needs, in one workspace
          </h2>
          <p className="mt-3 text-ink/70">
            Each capability below is part of the planner workspace today.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-sand bg-white/60 p-6 transition hover:border-clay/40 hover:shadow-sm"
            >
              <div
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-xl"
              >
                {f.icon}
              </div>
              <h3 className="mt-4 font-serif text-2xl text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------- Product preview */}
      <section className="rounded-3xl border border-sand bg-sand/30 px-6 py-14 sm:px-10">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">
            A closer look at the workspace
          </h2>
          <p className="mt-3 text-ink/70">
            Representative previews of the planner — illustrative, not live controls.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <SeatingPreview />
          <div className="grid gap-6">
            <BudgetPreview />
            <TimelinePreview />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- How it works */}
      <section id="how" className="py-16">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">How it works</h2>
          <p className="mt-3 text-ink/70">Three steps, from a new client to a shared plan.</p>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-sand bg-white/60 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-serif text-lg text-cream">
                {s.n}
              </div>
              <h3 className="mt-4 font-serif text-2xl text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------- Reassurance */}
      <section className="rounded-3xl bg-ink px-6 py-12 text-cream sm:px-10">
        <div className="grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl">
              Built for how planners actually work
            </h2>
            <p className="mt-3 max-w-xl text-cream/70">
              Keep every wedding's design and details together, bring your
              existing lists with you, and let couples weigh in without extra
              tools or accounts.
            </p>
          </div>
          <ul className="grid gap-3 text-sm">
            {[
              "One place for each wedding",
              "Import clients & guest lists from CSV",
              "Couples collaborate by private link",
            ].map((t) => (
              <li
                key={t}
                className="flex items-center gap-3 rounded-full border border-cream/15 bg-cream/5 px-4 py-3"
              >
                <span aria-hidden="true" className="text-sage">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- FAQ */}
      <section id="faq" className="py-16">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <div className="mt-8 max-w-3xl divide-y divide-sand rounded-2xl border border-sand bg-white/60">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-xl text-ink marker:content-none">
                {f.q}
                <span
                  aria-hidden="true"
                  className="ml-4 text-ink/40 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- Final CTA */}
      <section id="cta" className="mb-4 rounded-3xl border border-clay/30 bg-blush/20 px-6 py-14 text-center sm:px-10">
        <h2 className="mx-auto max-w-2xl font-serif text-4xl text-ink sm:text-5xl">
          Bring your next wedding together.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink/70">
          Create an account and open the workspace — design, cost and organise the
          whole day in one place.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/#cta"
            className="rounded-full bg-ink px-7 py-3 text-cream hover:bg-ink/90"
          >
            Get started
          </Link>
          <Link
            href="/#cta"
            className="rounded-full border border-ink/20 px-7 py-3 text-ink hover:border-ink/40"
          >
            Log in
          </Link>
        </div>
      </section>
    </>
  );
}

/* ================================================================== *
 * Static, illustrative preview components (no live data / no PII).
 * ================================================================== */

function HeroPreview() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
        {/* faux window chrome */}
        <div className="flex items-center gap-1.5 border-b border-sand bg-cream px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-blush" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-sand" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-sage/60" aria-hidden="true" />
          <span className="ml-3 text-xs text-ink/40">Styled · Garden romance</span>
        </div>
        <img
          src="/img/renders/garden_romance.jpg"
          alt="A styled wedding reception render: a garden marquee set for dinner in a soft, romantic palette."
          className="aspect-[4/3] w-full object-cover"
        />
        {/* a small costed-plan strip, mirroring the budget panel */}
        <div className="space-y-2 border-t border-sand bg-white px-4 py-4 text-sm">
          {[
            ["Marquee & draping", "£3,200"],
            ["Tables & linen", "£840"],
            ["Florals & centrepieces", "£1,150"],
          ].map(([item, price]) => (
            <div key={item} className="flex items-center justify-between">
              <span className="text-ink/70">{item}</span>
              <span className="font-medium text-ink">{price}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-sand pt-2 text-ink">
            <span className="font-medium">Estimated total</span>
            <span className="font-serif text-lg">£5,190</span>
          </div>
        </div>
      </div>

      {/* floating badge */}
      <div className="absolute -bottom-4 -left-3 hidden rounded-2xl border border-sand bg-cream px-4 py-2 text-xs text-ink/70 shadow-sm sm:block">
        Design → costed plan
      </div>
    </div>
  );
}

function PreviewFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-sand bg-cream px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
          {label}
        </span>
        <span className="text-[10px] text-ink/30">Preview</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SeatingPreview() {
  // A faithful, static echo of the interactive seating plan: a scaled room with
  // round and long tables and seats around them.
  return (
    <PreviewFrame label="Seating">
      <svg
        viewBox="0 0 400 300"
        className="h-full w-full rounded-xl bg-cream"
        role="img"
        aria-label="A scaled room layout with three dining tables and seats arranged around them."
      >
        {/* room outline */}
        <rect
          x="12"
          y="12"
          width="376"
          height="276"
          rx="8"
          fill="#faf6f0"
          stroke="#efe7db"
          strokeWidth="2"
        />
        {/* door mark */}
        <rect x="180" y="284" width="40" height="6" rx="3" fill="#b98a6a" />

        {/* round table (top-left) */}
        <g>
          <circle cx="120" cy="100" r="34" fill="#fff" stroke="#8a9a82" strokeWidth="2" />
          {seatRing(120, 100, 50, 8).map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="7" fill="#d9b7ad" />
          ))}
          <text x="120" y="104" textAnchor="middle" className="fill-ink" fontSize="12">
            T1
          </text>
        </g>

        {/* round table (right) */}
        <g>
          <circle cx="290" cy="120" r="34" fill="#fff" stroke="#8a9a82" strokeWidth="2" />
          {seatRing(290, 120, 50, 8).map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="7" fill="#d9b7ad" />
          ))}
          <text x="290" y="124" textAnchor="middle" className="fill-ink" fontSize="12">
            T2
          </text>
        </g>

        {/* long table (bottom) */}
        <g>
          <rect x="110" y="210" width="180" height="40" rx="6" fill="#fff" stroke="#8a9a82" strokeWidth="2" />
          {[130, 170, 210, 250, 270].map((x) => (
            <circle key={`t-${x}`} cx={x} cy="198" r="7" fill="#d9b7ad" />
          ))}
          {[130, 170, 210, 250, 270].map((x) => (
            <circle key={`b-${x}`} cx={x} cy="262" r="7" fill="#d9b7ad" />
          ))}
          <text x="200" y="234" textAnchor="middle" className="fill-ink" fontSize="12">
            Head table
          </text>
        </g>
      </svg>
      <p className="mt-3 text-xs text-ink/50">
        Scaled room · round &amp; long tables · seats you assign by name.
      </p>
    </PreviewFrame>
  );
}

function BudgetPreview() {
  const spent = 74;
  return (
    <PreviewFrame label="Budget">
      <div className="space-y-2.5 text-sm">
        {[
          ["Venue & marquee", "£4,040", "#8a9a82"],
          ["Florals", "£1,150", "#d9b7ad"],
          ["Catering", "£6,300", "#b98a6a"],
          ["Styling & décor", "£980", "#a67c52"],
        ].map(([item, price, dot]) => (
          <div key={item} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-ink/70">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: dot }}
                aria-hidden="true"
              />
              {item}
            </span>
            <span className="font-medium text-ink">{price}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-ink/50">
          <span>Budget used</span>
          <span>£12,470 of £17,000</span>
        </div>
        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-sand">
          <div className="h-full rounded-full bg-clay" style={{ width: `${spent}%` }} />
        </div>
      </div>
    </PreviewFrame>
  );
}

function TimelinePreview() {
  const items: [string, boolean][] = [
    ["Confirm venue & date", true],
    ["Book photographer", true],
    ["Send save-the-dates", false],
    ["Finalise menu tasting", false],
  ];
  return (
    <PreviewFrame label="Timeline">
      <ul className="space-y-2.5 text-sm">
        {items.map(([task, done]) => (
          <li key={task} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                done
                  ? "border-sage bg-sage/20 text-sage"
                  : "border-sand text-transparent"
              }`}
            >
              ✓
            </span>
            <span className={done ? "text-ink/45 line-through" : "text-ink/75"}>
              {task}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink/50">
        A checklist generated from the wedding date.
      </p>
    </PreviewFrame>
  );
}

/* Evenly space `count` seats on a circle of radius `r` around (cx, cy). */
function seatRing(cx: number, cy: number, r: number, count: number): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}
