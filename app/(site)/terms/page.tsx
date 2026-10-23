import Link from "next/link";
export const metadata = { title: "Service terms · Styled" };
export default function TermsPage() {
  return <article className="mx-auto max-w-3xl space-y-8 py-12 text-ink/80">
    <h1 className="font-serif text-4xl text-ink">Service terms</h1>
    <p>These notes explain the current planning and manual request service. Read the final quote and the terms supplied for your particular booking before agreeing to it. If anything is unclear, ask <a href="mailto:support@styleduk.com" className="underline">support@styleduk.com</a> before proceeding.</p>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Using your account and content</h2>
      <p>Keep your account credentials secure and provide accurate contact and request details. Upload only content you have permission to use. Do not submit another person’s confidential information or use the service to access another account or business workspace.</p>
      <p>Supplier and venue access requires an account linked to that business. Creating a customer account does not grant access to business records.</p>
    </section>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Inspiration and estimates</h2>
      <p>Generated looks, styling examples and illustrative catalogue content help you explore ideas. They do not guarantee an exact product, colour, layout, stock level or outcome. Check actual specifications, quantities and availability before booking.</p>
      <p>Catalogue totals are estimates. Submitting a supplier request does not take payment or reserve items. Supplier confirmation and a final quote come first; payment, delivery or collection and any deposit are then agreed separately.</p>
    </section>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Booking arrangements and changes</h2>
      <p>Confirm who supplies each item or venue service, what is included, dates, hire duration, setup, transport costs, payment dates and any damage arrangements in the written quote. Delivery coverage varies. Do not treat an estimated deposit or balance shown in planning as an agreed charge.</p>
      <p>A viewing appointment does not reserve a wedding date. A venue enquiry requires the venue’s response and agreement before a booking can be relied on.</p>
      <p>Contact support with your reference for changes, cancellations, payment questions or a problem with supplied items. Any booking-specific cancellation or refund arrangements need to be checked against what was agreed. These notes do not replace those arrangements.</p>
    </section>
    <p className="text-sm"><Link href="/service-info" className="underline">Service information and support</Link> · <Link href="/privacy" className="underline">Privacy information</Link></p>
  </article>;
}
