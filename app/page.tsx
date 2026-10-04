import Link from "next/link";
import VisualizerPreview from "@/components/VisualizerPreview";

/* ------------------------------------------------------------------ *
 * Styled — landing page
 * Product: wedding visualiser + marketplace
 * Audience: couples planning their wedding
 * ------------------------------------------------------------------ */

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Upload your venue",
    body: "Send us a photo of your venue, inside or out. That becomes the canvas for your entire design.",
  },
  {
    n: "02",
    title: "Design your day",
    body: "Pick your florals, furniture, linens and lighting from our catalogue. We generate a detailed preview showing exactly how it will all look in your space.",
  },
  {
    n: "03",
    title: "Shop and deliver",
    body: "Every item in your preview is a real product from a real vendor. Add to your order, pay once, and we coordinate delivery straight to your venue.",
  },
];

const FEATURES = [
  {
    title: "See it before you commit",
    body: "Get a detailed visual of your wedding before a single item is booked. Swap florals, change linens, try different lighting. You decide when it looks right.",
    accent: "bg-blush/30",
  },
  {
    title: "Shop the look",
    body: "Every element in your preview links to a real product. Add the exact pieces you chose to your basket in one click.",
    accent: "bg-sage/20",
  },
  {
    title: "Curated vendor network",
    body: "A hand-picked selection of UK florists, furniture hire, décor specialists and lighting designers, all vetted and ready to deliver.",
    accent: "bg-sand",
  },
  {
    title: "One order, door to door",
    body: "Pay for everything in a single transaction. We coordinate with each vendor and arrange delivery to your venue on your timeline.",
    accent: "bg-blush/20",
  },
];

const FAQS = [
  {
    q: "How does the preview work?",
    a: "You upload a photo of your venue and choose items from our catalogue. We composite a detailed image showing how those choices would look in your actual space. You can keep refining it until it feels right.",
  },
  {
    q: "Do I have to buy everything through Styled?",
    a: "No. You can use the preview tool to explore and then purchase only the items you want through us. We are working on a feature to include items you have sourced elsewhere.",
  },
  {
    q: "What happens once I place an order?",
    a: "Styled coordinates with each vendor in your order, confirms stock and availability, and arranges delivery to your venue on the dates you set. You deal with us, not five different suppliers.",
  },
  {
    q: "Where do you deliver?",
    a: "We are currently delivering across London, Essex and Hertfordshire. The rest of the UK is coming shortly.",
  },
  {
    q: "I am a wedding vendor. Can I list my products?",
    a: "Yes. Scroll down to the vendor section and apply to join. We review every application to keep the quality consistent for couples.",
  },
];

const PRODUCTS = [
  { name: "Ivory Pillar Candles, set of 12", vendor: "The Wax Atelier", price: "£38", category: "Lighting" },
  { name: "Garden Rose Centrepiece", vendor: "Bloom & Co.", price: "£85", category: "Florals" },
  { name: "White Linen Tablecloth, 16ft", vendor: "Heirloom Linens", price: "£45", category: "Linens" },
  { name: "Gold Taper Candleholder", vendor: "The Wax Atelier", price: "£12", category: "Lighting" },
  { name: "Ghost Chair, per chair", vendor: "Luxe Chair Hire", price: "£8", category: "Furniture" },
  { name: "Eucalyptus Table Runner", vendor: "Bloom & Co.", price: "£22", category: "Florals" },
];

export default function Page() {
  return (
    <>
      {/* ------------------------------------------------- Hero */}
      <section className="pb-8 pt-10 sm:pb-12 sm:pt-16">
        <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:items-center lg:gap-12">
          <div>
            <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
              See your wedding before the day. Then buy every piece of it.
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink/70 sm:mt-5 sm:text-lg">
              Upload a photo of your venue, choose your flowers, furniture and
              lighting, and see exactly how it will look. Everything you pick is
              shoppable and delivered straight to your door.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <Link
                href="/#cta"
                className="rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90 sm:text-base"
              >
                Get started
              </Link>
              <a
                href="/#how"
                className="rounded-full border border-ink/20 px-6 py-3 text-sm text-ink hover:border-ink/40 sm:text-base"
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
          <span>Curated vendor marketplace</span>
          <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block" aria-hidden />
          <span>London, Essex and Hertfordshire</span>
          <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block" aria-hidden />
          <span>Delivered to your venue</span>
          <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block" aria-hidden />
          <span>One checkout for every item</span>
        </div>
      </section>

      {/* ------------------------------------------------- How it works */}
      <section id="how" className="py-20">
        <h2 className="font-serif text-4xl text-ink sm:text-5xl">
          From empty venue to your dream wedding.
        </h2>
        <p className="mt-3 max-w-lg text-ink/60">
          Upload, design and shop. It really is that simple.
        </p>
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.n} className="flex flex-col gap-4">
              <span className="font-serif text-5xl text-clay/50">{s.n}</span>
              <h3 className="font-serif text-2xl text-ink">{s.title}</h3>
              <p className="text-ink/60">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- Style demo */}
      <section className="rounded-3xl border border-sand bg-sand/30 px-6 py-14 sm:px-10">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-4xl text-ink sm:text-5xl">
            Try every style before you commit.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink/60">
            Switch between looks instantly. Change one detail or the whole room.
            You only order when it looks exactly right.
          </p>
        </div>
        <StyleDemoPreview />
      </section>

      {/* ------------------------------------------------- Features */}
      <section id="features" className="py-20">
        <h2 className="font-serif text-4xl text-ink sm:text-5xl">
          Design, shop, deliver.
        </h2>
        <p className="mt-3 max-w-lg text-ink/60">
          No spreadsheets, no chasing five different suppliers, no guessing how it
          will look.
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

      {/* ------------------------------------------------- Marketplace */}
      <section className="py-4">
        <div className="rounded-3xl border border-sand bg-cream px-6 py-12 sm:px-10">
          <div className="mb-8">
            <h2 className="font-serif text-4xl text-ink sm:text-5xl">
              Shop the look.
            </h2>
            <p className="mt-3 max-w-lg text-ink/60">
              Every item in your preview is a real product from a real vendor. Add
              it to your order and we handle the rest.
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
          List your products on Styled and reach couples who are already designing
          their wedding. We handle the transaction. You focus on what you do best.
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
          <span>✓ Commission only, no upfront fees</span>
          <span>✓ We manage payments and logistics</span>
          <span>✓ Direct access to engaged couples</span>
        </div>
      </section>

      {/* ------------------------------------------------- FAQ */}
      <section id="faq" className="py-20">
        <h2 className="font-serif text-4xl text-ink sm:text-5xl">
          Good to know.
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
      <section
        id="cta"
        className="mb-4 rounded-3xl border border-clay/30 bg-blush/20 px-6 py-14 text-center sm:px-10"
      >
        <h2 className="mx-auto max-w-2xl font-serif text-4xl text-ink sm:text-5xl">
          Your wedding, exactly how you pictured it.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink/70">
          Create a free account, upload your venue photo and start putting your
          look together. When you are ready, order everything in one go.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="Your email address"
            className="flex-1 rounded-full border border-sand bg-white px-5 py-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-clay/40"
          />
          <Link
            href="/#cta"
            className="rounded-full bg-ink px-6 py-3 text-center text-cream hover:bg-ink/90"
          >
            Get started free
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink/40">
          No credit card needed. Cancel any time.
        </p>
      </section>
    </>
  );
}

/* ================================================================== *
 * Preview components — illustrative, no live data.
 * ================================================================== */

function StyleDemoPreview() {
  const renders = [
    { src: "/img/renders/garden_romance.jpg", label: "Garden Romance" },
    { src: "/img/renders/classic_elegance.jpg", label: "Classic Elegance" },
    { src: "/img/renders/modern_minimal.jpg", label: "Modern Minimal" },
    { src: "/img/renders/rustic_barn.jpg", label: "Wildflower" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {renders.map((r, i) => (
        <div key={r.label} className="group relative overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.src}
            alt={r.label}
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

function MarketplacePreview() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((p) => (
        <div
          key={p.name}
          className="flex flex-col gap-3 rounded-2xl border border-sand bg-cream p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">{p.name}</p>
              <p className="mt-0.5 text-xs text-ink/40">{p.vendor}</p>
            </div>
            <span className="shrink-0 font-serif text-lg text-clay">{p.price}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-sand px-2 py-0.5 text-xs text-ink/50">
              {p.category}
            </span>
            <button
              type="button"
              className="rounded-full bg-ink px-3 py-1.5 text-xs text-cream hover:bg-ink/90"
            >
              Add to order
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
