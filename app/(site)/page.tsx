import Image from "next/image";
import Link from "next/link";
import CtaEmailForm from "@/components/CtaEmailForm";
import VisualizerPreview from "@/components/VisualizerPreview";

/* ------------------------------------------------------------------ *
 * Styled — landing page
 * Product: wedding visualiser + marketplace
 * Audience: couples planning their wedding
 * ------------------------------------------------------------------ */

const FEATURES = [
  {
    n: "I",
    title: "See it before you commit",
    body: "Turn a venue photo into wedding inspiration. AI details may differ from real products.",
  },
  {
    n: "II",
    title: "Shop the look",
    body: "Discover real catalogue pieces and build your basket alongside your preview.",
  },
  {
    n: "III",
    title: "Explore suppliers",
    body: "Find flowers, furniture, décor and lighting from wedding suppliers.",
  },
  {
    n: "IV",
    title: "Request, then confirm",
    body: "Request a quote, then agree availability, payment and delivery before booking.",
  },
];

const FAQS = [
  {
    q: "How does the preview work?",
    a: "Upload a venue photo and describe your look or choose catalogue pieces. The generated image is an illustration to help you explore ideas, not an exact product, layout or colour guarantee.",
  },
  {
    q: "Do I have to buy everything through Styled?",
    a: "No. Use the preview to explore ideas and request only the catalogue pieces you want. A preview does not reserve stock or create a booking.",
  },
  {
    q: "What happens after I submit a request?",
    a: "Styled checks your selection and dates manually with suppliers. You receive confirmation and a final quote before agreeing payment and delivery or collection. Submitting a request does not take payment or reserve stock.",
  },
  {
    q: "Is delivery available to my venue?",
    a: "Coverage, delivery and collection options vary by supplier and venue. These arrangements and any extra costs need to be confirmed as part of your final quote.",
  },
];

const PRODUCTS = [
  {
    name: "Flowers that set the mood",
    category: "Florals",
    image: "/img/shop/shop_florals.webp",
    alt: "Blush and ivory rose centrepiece with eucalyptus on a wedding reception table",
    detail:
      "Start with a centrepiece, then coordinate flowers across your reception.",
  },
  {
    name: "Every place, beautifully set",
    category: "Table settings",
    image: "/img/shop/shop_tableware.webp",
    alt: "Ivory plate, blush linen napkin, gold cutlery and glassware arranged for a wedding reception",
    detail:
      "Bring linens, napkins and tableware together in one cohesive look.",
  },
  {
    name: "The finishing touch",
    category: "Furniture",
    image: "/img/shop/shop_chairs.webp",
    alt: "Gold wedding reception chairs with ivory cushions beside a dressed dining table",
    detail:
      "Choose chairs and furniture that complement your venue and flowers.",
  },
];

export default function Page() {
  return (
    <>
      {/* ------------------------------------------------- Hero */}
      <section className="pb-8 pt-10 sm:pb-12 sm:pt-16">
        <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:items-center lg:gap-12">
          <div>
            <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
              Picture your wedding. Build a selection you love.
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink/70 sm:mt-5 sm:text-lg">
              Plan your events, collect ideas and explore how your venue could look. Find the pieces you love, then request availability and a quote from suppliers.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <Link
                href="/design"
                className="rounded-full bg-ink px-6 py-3 text-sm text-cream hover:bg-ink/90 sm:text-base"
              >
                Get started
              </Link>
            </div>
          </div>
          <VisualizerPreview />
        </div>
      </section>

      {/* ------------------------------------------------- Trust band */}
      <section className="rounded-2xl border border-sand bg-sand/40 px-6 py-5">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-ink/60">
          <span>Supplier availability checked manually</span>
          <span
            className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block"
            aria-hidden
          />
          <span>Delivery or collection agreed with you</span>
          <span
            className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block"
            aria-hidden
          />
          <span>No payment taken on request</span>
        </div>
      </section>

      {/* ------------------------------------------------- Style demo */}
      <section className="mt-16 rounded-3xl border border-sand bg-sand/30 px-6 py-14 sm:px-10">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-4xl text-ink sm:text-5xl">
            Try every style before you commit.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink/60">
            One barn, three wedding reception styles. Explore how flowers, table
            settings and lighting can transform the same space.
          </p>
        </div>
        <StyleDemoPreview />
        <p className="mt-5 text-center text-sm text-ink/70">Illustrative generated looks. Products, colours and layouts may differ in practice.</p>
      </section>

      {/* ------------------------------------------------- Features */}
      <section id="features" className="py-20">
        <h2 className="font-serif text-4xl text-ink sm:text-5xl">
          Explore, select, request.
        </h2>
        <p className="mt-3 max-w-lg text-ink/60">
          Keep inspiration and supplier selections together as your plans take shape.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-sand bg-white px-7 py-8 shadow-sm"
            >
              <span className="font-serif text-xs tracking-[0.2em] text-clay/70 uppercase">
                {f.n}
              </span>
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
              table settings and furniture, then build your selection in the
              design studio.
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
      <section id="cta" className="my-10 flex flex-wrap items-center justify-between gap-6 border-t border-sand pt-8">
        <div><h2 className="font-serif text-3xl">Ready to start planning?</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/70">Create a free account to keep your ideas. No payment is taken when you submit a supplier request.</p></div>
        <CtaEmailForm />
      </section>
    </>
  );
}

/* ================================================================== *
 * Preview components — illustrative, no live data.
 * ================================================================== */

function StyleDemoPreview() {
  const renders = [
    {
      src: "/img/venues/oak_barn.png",
      label: "Original venue",
      detail: "The barn before styling",
    },
    {
      src: "/img/renders/barn_garden_romance.webp",
      label: "Garden Romance",
      detail: "Blush roses and gold details",
    },
    {
      src: "/img/renders/barn_classic_elegance.webp",
      label: "Classic Elegance",
      detail: "Ivory florals and candlelight",
    },
    {
      src: "/img/renders/barn_wildflower.webp",
      label: "Wildflower",
      detail: "Meadow flowers and natural wood",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {renders.map((r) => (
        <figure
          key={r.label}
          className="overflow-hidden rounded-2xl border border-sand bg-white"
        >
          <Image
            src={r.src}
            alt={
              r.label === "Original venue"
                ? "Empty oak barn with timber beams, white walls and a wooden floor"
                : `Oak barn wedding reception in ${r.label} style, with guest dining tables and a raised wedding-party top table at the back`
            }
            width={1536}
            height={1024}
            className="aspect-[3/2] w-full object-contain"
          />
          <figcaption className="px-4 py-4">
            <p className="font-serif text-xl text-ink">{r.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink/60">
              {r.detail}
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function MarketplacePreview() {
  return (
    <div>
      <p className="mb-4 text-xs font-medium tracking-wide text-clay">
        One coordinated look: Garden Romance
      </p>
      <div className="grid gap-5 md:grid-cols-3">
        {PRODUCTS.map((p) => (
          <article
            key={p.name}
            className="overflow-hidden rounded-2xl border border-sand bg-white"
          >
            <Image
              src={p.image}
              alt={p.alt}
              width={1536}
              height={1024}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-5">
              <p className="text-xs font-medium text-clay">{p.category}</p>
              <h3 className="mt-2 font-serif text-2xl text-ink">{p.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                {p.detail}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4 border-t border-sand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-lg text-sm leading-relaxed text-ink/60">
          Explore a category, choose your pieces and adjust quantities for your
          guest count. These images show styling inspiration, rather than
          confirmed supplier stock.
        </p>
        <Link
          href="/design"
          className="shrink-0 self-start rounded-full bg-ink px-6 py-3 text-sm text-cream transition-colors hover:bg-ink/90"
        >
          Explore the design studio
        </Link>
      </div>
    </div>
  );
}
