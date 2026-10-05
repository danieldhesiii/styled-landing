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
    n: "I",
    title: "See it before you commit",
    body: "Get a detailed visual of your wedding before a single item is booked. Swap florals, change linens, try different lighting. You decide when it looks right.",
  },
  {
    n: "II",
    title: "Shop the look",
    body: "Every element in your preview links to a real product. Add the exact pieces you chose to your basket in one click.",
  },
  {
    n: "III",
    title: "Curated vendor network",
    body: "A hand-picked selection of UK florists, furniture hire, décor specialists and lighting designers, all vetted and ready to deliver.",
  },
  {
    n: "IV",
    title: "One order, door to door",
    body: "Pay for everything in a single transaction. We coordinate with each vendor and arrange delivery to your venue on your timeline.",
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
];

const PRODUCTS = [
  { name: "Flowers that set the mood", category: "Florals", image: "/img/shop/shop_florals.webp", alt: "Blush and ivory rose centrepiece with eucalyptus on a wedding reception table", detail: "Start with a centrepiece, then coordinate flowers across your reception." },
  { name: "Every place, beautifully set", category: "Table settings", image: "/img/shop/shop_tableware.webp", alt: "Ivory plate, blush linen napkin, gold cutlery and glassware arranged for a wedding reception", detail: "Bring linens, napkins and tableware together in one cohesive look." },
  { name: "The finishing touch", category: "Furniture", image: "/img/shop/shop_chairs.webp", alt: "Gold wedding reception chairs with ivory cushions beside a dressed dining table", detail: "Choose chairs and furniture that complement your venue and flowers." },
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
                href="/design"
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
            One barn, three wedding reception styles. Explore how flowers,
            table settings and lighting can transform the same space.
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
              className="rounded-2xl border border-sand bg-white px-7 py-8 shadow-sm"
            >
              <span className="font-serif text-xs tracking-[0.2em] text-clay/70 uppercase">{f.n}</span>
              <h3 className="mt-3 font-serif text-2xl text-ink">{f.title}</h3>
              <div className="mt-2 h-px w-8 bg-clay/40" />
              <p className="mt-3 text-ink/60">{f.body}</p>
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
              Find the pieces that bring your vision together. Explore flowers,
              table settings and furniture, then build your selection in the design studio.
            </p>
          </div>
          <MarketplacePreview />
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
            href="/design"
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
    { src: "/img/venues/oak_barn.png", label: "Original venue", detail: "The barn before styling" },
    { src: "/img/renders/barn_garden_romance.webp", label: "Garden Romance", detail: "Blush roses and gold details" },
    { src: "/img/renders/barn_classic_elegance.webp", label: "Classic Elegance", detail: "Ivory florals and candlelight" },
    { src: "/img/renders/barn_wildflower.webp", label: "Wildflower", detail: "Meadow flowers and natural wood" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {renders.map((r) => (
        <figure key={r.label} className="overflow-hidden rounded-2xl border border-sand bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.src}
            alt={r.label === "Original venue" ? "Empty oak barn with timber beams, white walls and a wooden floor" : `Oak barn wedding reception in ${r.label} style, with guest dining tables and a raised wedding-party top table at the back`}
            width={1536}
            height={1024}
            loading="lazy"
            className="aspect-[3/2] w-full object-contain"
          />
          <figcaption className="px-4 py-4">
            <p className="font-serif text-xl text-ink">{r.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink/60">{r.detail}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function MarketplacePreview() {
  return (
    <div>
      <p className="mb-4 text-xs font-medium tracking-wide text-clay">One coordinated look: Garden Romance</p>
      <div className="grid gap-5 md:grid-cols-3">
        {PRODUCTS.map((p) => (
          <article key={p.name} className="overflow-hidden rounded-2xl border border-sand bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={p.alt} width={1536} height={1024} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="p-5">
              <p className="text-xs font-medium text-clay">{p.category}</p>
              <h3 className="mt-2 font-serif text-2xl text-ink">{p.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{p.detail}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4 border-t border-sand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-lg text-sm leading-relaxed text-ink/60">
          Explore a category, choose your pieces and adjust quantities for your guest count.
          These images show styling inspiration, rather than confirmed supplier stock.
        </p>
        <Link href="/design" className="shrink-0 self-start rounded-full bg-ink px-6 py-3 text-sm text-cream transition-colors hover:bg-ink/90">
          Explore the design studio
        </Link>
      </div>
    </div>
  );
}
