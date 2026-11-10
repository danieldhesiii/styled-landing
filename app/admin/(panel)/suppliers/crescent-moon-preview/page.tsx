import Link from 'next/link';
import products from '@/lib/crescent-moon-preview.json';

export const metadata = {
  title: 'Crescent Moon private range review · Styled',
  robots: { index: false, follow: false },
};

const money = (amount: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount);

export default function CrescentMoonPreview() {
  return (
    <section>
      <Link href="/admin/suppliers" className="inline-flex min-h-11 items-center text-sm underline">
        Back to suppliers
      </Link>
      <p className="mt-5 text-sm text-clay">Private supplier review</p>
      <h1 className="mt-2 font-serif text-4xl">Crescent Moon chandeliers</h1>
      <p className="mt-4 max-w-2xl text-ink/65">
        Six chandelier designs from Crescent Moon, with product photographs and specifications.
      </p>

      <details className="my-6 border-y border-sand py-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Supplier background and lead times</summary>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/70">
          Crescent Moon supplies, hires and bespoke-manufactures chandeliers for weddings and
          events. The brochure describes oversized designs, large matching sets and UK-wide
          delivery. Delivery, installation and venue access still need to be quoted for each job.
          It also says bespoke giant necklace designs can take 12 to 16 weeks; the Necklace Empire
          180 shown here is listed separately as an in-stock model, so confirm its current status.
        </p>
      </details>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => {
          const pricing = p.mockPricing;
          const totalDue = pricing
            ? pricing.dailyHireGBP + pricing.deliverySetupCollectionGBP + pricing.damageDepositGBP
            : null;

          return (
            <article key={p.slug} className="overflow-hidden rounded-2xl border border-sand bg-white">
              <img
                src={`/api/admin/crescent-moon-preview/${p.slug}`}
                alt={p.name}
                className="h-72 w-full bg-sand/40 object-contain"
              />
              <div className="p-5">
                <p className="text-sm text-clay">Crescent Moon</p>
                <h2 className="mt-2 font-serif text-2xl">{p.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{p.description}</p>

                <dl className="my-5 grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Fixture drop', `${p.dropCm} cm`],
                    ['Diameter', `${p.diameterCm} cm`],
                    ['Weight', `${p.weightKg} kg`],
                    ['Bulbs', p.bulbs],
                    ['Bulb type', p.bulbType],
                    ['Output', `${p.outputW} W`],
                    ].map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm text-ink/55">{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>

                {pricing && totalDue !== null ? (
                  <div className="rounded-xl bg-sand/50 p-4">
                    <p className="font-medium">One-day hire</p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt>Hire, per day</dt>
                        <dd>{money(pricing.dailyHireGBP)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Delivery, setup and collection</dt>
                        <dd>{money(pricing.deliverySetupCollectionGBP)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Refundable damage deposit</dt>
                        <dd>{money(pricing.damageDepositGBP)}</dd>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-sand pt-2 text-base font-semibold">
                        <dt>Total due for one day</dt>
                        <dd>{money(totalDue)}</dd>
                      </div>
                    </dl>

                  </div>
                ) : (
                  <div className="rounded-xl bg-sand/50 p-4">
                    <p className="font-medium">Complete price on request</p>
                    <p className="mt-2 text-sm leading-relaxed text-ink/60">
                      Ask for hire, delivery, setup, collection and any refundable deposit in the full quote.
                    </p>
                  </div>
                )}



                <details className="mt-4 border-t border-sand pt-3 text-sm">
                  <summary className="min-h-11 cursor-pointer py-2">Review notes and source</summary>
                  <p className="mt-2">{p.note}</p>
                  <p className="mt-2 break-words">
                    Brochure PDF page {p.brochurePage}. Photo: {p.imageSource}.
                  </p>
                </details>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-8 border-t border-sand py-6">
        <h2 className="font-serif text-2xl">Next: approve the starter range</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/65">
          Review prices, stock, terms and permissions before approving the range. This private preview does not publish products or enable bookings.
        </p>
        <details className="mt-3 text-sm text-ink/65"><summary className="min-h-11 cursor-pointer py-3">Approval checklist</summary><p>Check photo matches, specifications, daily prices and VAT, delivery/setup/collection fees, refundable deposits, availability contacts, booking terms and separate public-photo and AI-reference permissions.</p></details>
      </section>
    </section>
  );
}
