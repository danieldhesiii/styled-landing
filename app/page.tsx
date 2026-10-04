import Image from "next/image";
import Link from "next/link";

/* ------------------------------------------------------------------ *
 * Styled — landing page (v2)
 * Product: AI wedding visualiser + marketplace
 * Audience: couples planning their wedding
 * Design tokens: ink/cream/sand/clay/sage/blush/gold (tailwind.config.ts)
 * ------------------------------------------------------------------ */

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Upload your venue",
    body: "Upload a photo of your venue — inside or out. Styled uses it as the canvas for your design.",
  },
  {
    n: "02",
    title: "Design with AI",
    body: "Pick your flowers, furniture, linens and lighting. Our AI generates a photorealistic render of exactly how it will look on the day.",
  },
  {
    n: "03",
    title: "Shop & deliver",
    body: "Every item in your render is shoppable. Add to cart, check out once, and it all gets delivered straight to your venue.",
  },
];

const FEATURES = [
  {
    title: "AI visualisation",
    body: "See a photorealistic render of your wedding before a single item is booked. Tweak colours, swap florals, change linens — in seconds.",
    accent: "bg-blush/30",
  },
  {
    title: "Shop the look",
    body: "Every element in your render is linked to a real product. Add the exact items you fell in love with to your basket in one click.",
    accent: "bg-sage/20",
  },
  {
    title: "500+ curated vendors",
    body: "A hand-picked network of UK florists, furniture hire, décor specialists and lighting designers — all vetted and ready to deliver.",
    accent: "bg-sand",
  },
  {
    title: "One checkout, door-to-door",
    body: "Pay for everything in a single transaction. We coordinate with each vendor and arrange delivery straight to your venue on your timeline.",
    accent: "bg-blush/20",
  },
];

const FAQS = [
  {
    q: "How does the AI rendering work?",
    a: "You upload a photo of your venue and select the items, styles and colours you're interested in. Our AI composites a photorealistic image showing exactly how those choices would look in your space — no guesswork, no mood boards.",
  },
  {
    q: "Can I use items not listed on Styled?",
    a: "For now the render pulls from our vendor catalogue so every item is shoppable. We're working on a custom item upload feature so you can include things you've sourced elsewhere.",
  },
  {
    q: "What happens when I place an order?",
    a: "Styled coordinates with each vendor in your order, confirms availability, and arranges delivery to your venue on the dates you specify. You deal with us — not five different suppliers.",
  },
  {
    q: "Are you available across the UK?",
    a: "We're launching in London, Essex and Hertfordshire first, with the rest of the UK following shortly after.",
  },
  {
    q: "I'm a vendor — can I list my products?",
    a: "Yes. Head to the vendor section below and apply to join the network. We review every application to maintain quality.",
  },
];

export default function Page() {
  return (
    <>
      {/* ------------------------------------------------- Hero */}
      <section className="pb-16 pt-20 sm:pt-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <span className="inline-block rounded-full border border-clay/40 bg-blush/30 px-3 py-1 text-xs tracking-wide text-clay">
              AI Wedding Design · UK Marketplace
            </span>
            <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">
              See your wedding before the day. Then buy every piece of it.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink/70">
              Upload your venue, choose your style, and watch your wedding come to
              life with AI. Everything you see is shoppable — delivered straight to
              your door.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/#cta"
                className="rounded-full bg-ink px-6 py-3 text-cream hover:bg-ink/90"
              >
                Get started
              </Link>
              <a
                href="/#how"
                className="rounded-full border border-ink/20 px-6 py-3 text-ink hover:border-ink/40"
              >
                See how it works
              </a>
            </div>
          </div>
          <VisualizerPreview />
        </div>
      </section>

      {/* ------------------------------------------------- Trust band */}
      <section className="rounded-2xl border border-sand bg-sand/40 px-6 py-5">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-ink/60">
          <span>500+ curated vendor products</span>
          <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block" aria-hidden />
          <span>London · Essex · Hertfordshire</span>
          <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block" aria-hidden />
          <span>Delivered to your venue</span>
          <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block" aria-hidden />
          <span>One checkout, every item</span>
        </div>
      </section>

      {/* ------------------------------------------------- How it works */}
      <section id="how" className="py-20">
        <h2 className="font-serif text-4xl text-ink sm:text-5xl">
          From empty venue to dream wedding.
        </h2>
        <p className="mt-3 max-w-lg text-ink/60">Three steps is all it takes.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.n} className="flex flex-col gap-4">
              <span className="font-serif text-5xl text-clay/50">{s.n}</span>
              <h3 className="font-serif text-2xl text-ink">{s.title}</h3>
              <p className="text-ink/60">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- Visualiser demo */}
      <section className="rounded-3xl border border-sand bg-sand/30 px-6 py-14 sm:px-10">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-4xl text-ink sm:text-5xl">
            Design your day in real time.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink/60">
            Swap florals, change linens, try different lighting — the render updates
            instantly so you can try before you buy.
          </p>
        </div>
        <StyleDemoPreview />
      </section>

      {/* ------------------------------------------------- Features */}
      <section id="features" className="py-20">
        <h2 className="font-serif text-4xl text-ink sm:text-5xl">
          Everything in one place.
        </h2>
        <p className="mt-3 max-w-lg text-ink/60">
          Design, shop and deliver — without leaving Styled.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`${f.accent} rounded-2xl border border-sand/60 px-7 py-8`}
            >
              <h3 className="font-serif text-2xl text-ink">{f.title}</h3>
              <p className="mt-2 text-ink/60">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- Marketplace preview */}
      <section className="py-4">
        <div className="rounded-3xl border border-sand bg-cream px-6 py-12 sm:px-10">
          <div className="mb-8">
            <h2 className="font-serif text-4xl text-ink sm:text-5xl">
              Shop the look.
            </h2>
            <p className="mt-3 max-w-lg text-ink/60">
              Every item in your render is a real product from a real vendor. Add
              it to your order — we handle the rest.
            </p>
          </div>
          <MarketplacePreview />
        </div>
      </section>

      {/* ------------------------------------------------- Vendor band */}
      <section className="my-6 rounded-3xl border border-clay/30 bg-ink px-8 py-14 text-center">
        <h2 className="font-serif text-4xl text-cream sm:text-5xl">
          Are you a wedding vendor?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-cream/60">
          List your products on Styled and reach thousands of couples already
          designing their weddings. We handle the transaction — you focus on
          delivery.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/#cta"
            className="rounded-full bg-cream px-7 py-3 text-ink hover:bg-cream/90"
          >
            Join as a vendor
          </Link>
          <Link
            href="/#faq"
            className="rounded-full border border-cream/30 px-7 py-3 text-cream hover:border-cream/60"
          >
            Learn more
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-cream/50">
          <span>✓ Commission-based — no upfront fees</span>
          <span>✓ We manage payments &amp; logistics</span>
          <span>✓ Direct access to engaged couples</span>
        </div>
      </section>

      {/* ------------------------------------------------- FAQ */}
      <section id="faq" className="py-20">
        <h2 className="font-serif text-4xl text-ink sm:text-5xl">
          Questions &amp; answers.
        </h2>
        <div className="mt-10 divide-y divide-sand">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl text-ink">
                {f.q}
                <span
                  className="shrink-0 text-clay transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-ink/60">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- Final CTA */}
      <section id="cta" className="mb-4 rounded-3xl border border-clay/30 bg-blush/20 px-6 py-14 text-center sm:px-10">
        <h2 className="mx-auto max-w-2xl font-serif text-4xl text-ink sm:text-5xl">
          Your wedding, exactly as you imagined it.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink/70">
          Create an account, upload your venue and start designing. Everything
          you see can be delivered to your door.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/#cta"
            className="rounded-full bg-ink px-7 py-3 text-cream hover:bg-ink/90"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/#how"
            className="rounded-full border border-ink/20 px-7 py-3 text-ink hover:border-ink/40"
          >
            See how it works
          </Link>
        </div>
      </section>
    </>
  );
}

/* ================================================================== *
 * Preview components — illustrative only, no live data.
 * ================================================================== */

const STYLES = ["Garden Romance", "Classic Elegance", "Modern Minimal", "Rustic Barn"];

function VisualizerPreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
      {/* faux browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-sand bg-cream px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-blush" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-sand" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-sage/60" aria-hidden />
        <span className="mx-auto font-sans text-xs text-ink/30">styled.co/design</span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {/* Venue upload */}
        <div className="relative overflow-hidden rounded-xl border border-sand">
          <div className="absolute left-2 top-2 z-10 rounded-full bg-ink/60 px-2 py-0.5 text-[10px] text-cream">
            Your venue
          </div>
          <Image
            src="/img/venues/manor_orangery.png"
            alt="Venue upload"
            width={280}
            height={180}
            className="h-36 w-full object-cover"
          />
        </div>
        {/* AI render */}
        <div className="relative overflow-hidden rounded-xl border border-clay/30">
          <div className="absolute left-2 top-2 z-10 rounded-full bg-clay/80 px-2 py-0.5 text-[10px] text-cream">
            AI render
          </div>
          <Image
            src="/img/renders/garden_romance.jpg"
            alt="AI styled render"
            width={280}
            height={180}
            className="h-36 w-full object-cover"
          />
        </div>
      </div>

      {/* Style picker */}
      <div className="border-t border-sand px-3 pb-3 pt-2">
        <p className="mb-2 text-[11px] text-ink/40">Style</p>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((s, i) => (
            <span
              key={s}
              className={`rounded-full border px-3 py-1 text-xs ${
                i === 0
                  ? "border-clay bg-clay text-cream"
                  : "border-sand text-ink/60"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StyleDemoPreview() {
  const renders = [
    { src: "/img/renders/garden_romance.jpg", label: "Garden Romance" },
    { src: "/img/renders/classic_elegance.jpg", label: "Classic Elegance" },
    { src: "/img/renders/modern_minimal.jpg", label: "Modern Minimal" },
    { src: "/img/renders/rustic_barn.jpg", label: "Rustic Barn" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {renders.map((r, i) => (
        <div key={r.label} className="group relative overflow-hidden rounded-2xl">
          <Image
            src={r.src}
            alt={r.label}
            width={300}
            height={200}
            className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-52"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent p-3">
            <p className="font-serif text-sm text-cream">{r.label}</p>
          </div>
          {i === 0 && (
            <div className="absolute right-2 top-2 rounded-full bg-clay px-2 py-0.5 text-[10px] text-cream">
              Selected
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const PRODUCTS = [
  { name: "Ivory Pillar Candles (set of 12)", vendor: "The Wax Atelier", price: "£38", category: "Lighting" },
  { name: "Garden Rose Centrepiece", vendor: "Bloom & Co.", price: "£85", category: "Florals" },
  { name: "White Linen Tablecloth (16ft)", vendor: "Heirloom Linens", price: "£45", category: "Linens" },
  { name: "Gold Taper Candleholder", vendor: "The Wax Atelier", price: "£12", category: "Lighting" },
  { name: "Ghost Chair (per chair)", vendor: "Luxe Chair Hire", price: "£8", category: "Furniture" },
  { name: "Eucalyptus Table Runner", vendor: "Bloom & Co.", price: "£22", category: "Florals" },
];

function MarketplacePreview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((p) => (
        <div
          key={p.name}
          className="flex flex-col gap-2 rounded-2xl border border-sand bg-cream p-4"
        >
          {/* product image placeholder */}
          <div className="h-24 w-full rounded-xl bg-sand/60" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">{p.name}</p>
              <p className="mt-0.5 text-xs text-ink/40">{p.vendor}</p>
            </div>
            <span className="shrink-0 font-serif text-base text-clay">{p.price}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-sand px-2 py-0.5 text-xs text-ink/50">
              {p.category}
            </span>
            <button
              type="button"
              className="rounded-full bg-ink px-3 py-1 text-xs text-cream hover:bg-ink/90"
            >
              Add to order
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
