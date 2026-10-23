import Link from "next/link";
export const metadata = { title: "Service information & support · Styled", description: "How Styled supplier requests, illustrative images, quotes and account support work." };
export default function ServiceInfoPage() {
  return <article className="mx-auto max-w-3xl space-y-8 py-12 text-ink/80">
    <h1 className="font-serif text-4xl text-ink">Service information & support</h1>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Supplier requests and payment</h2>
      <p>Build a selection, submit a request, receive manual supplier confirmation and a final quote, then agree payment and delivery or collection before booking. A submitted request does not reserve stock or take payment.</p>
      <p>Catalogue totals are estimates. Delivery, collection, setup, hire duration, deposits and any damage arrangements need to be confirmed for the pieces and suppliers you choose. An estimated total in your bookings is not a receipt, invoice or payment deadline.</p>
      <p>Check the written quote and agreed terms before paying. For changes, cancellations, refunds or a payment question, contact support with your reference so the relevant arrangements can be checked.</p>
    </section>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Images and catalogue information</h2>
      <p>Generated wedding looks and styling examples are illustrative. They may change colours, proportions, quantities or product details. They do not guarantee an exact visual match or confirm that an item can be supplied.</p>
      <p>Confirm dimensions, materials, hire units, quantities and what is included with your quote. Coverage and delivery options depend on the supplier, venue and date. Showcase imagery or sample content is not evidence of a verified customer review.</p>
    </section>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Venue requests</h2>
      <p>A viewing request asks for an appointment; it does not reserve a wedding date. A wedding enquiry also needs venue confirmation. Check the request status and the venue’s response before making plans or agreeing payment.</p>
      <p>Demo venues are examples for exploring the service and cannot be booked.</p>
    </section>
    <section id="support" className="scroll-mt-28 space-y-3"><h2 className="font-serif text-2xl text-ink">Contact support</h2>
      <p>Email <a href="mailto:support@styleduk.com" className="underline">support@styleduk.com</a> for account access, supplier or venue access, request questions, corrections or privacy enquiries.</p>
      <p>Include your account email, request reference or listing name, and a short description of what happened. Never send your password, recovery link, card details or a one-time code. Screenshots should hide private details.</p>
      <p>Supplier and venue workspace access is linked separately from a customer account. If your business already has a listing, ask support to check the linked email before creating another listing.</p>
      <div className="flex flex-wrap gap-4 text-sm"><Link href="/auth/recovery" className="underline">Recover account access</Link><Link href="/login?mode=login" className="underline">Log in</Link><Link href="/portal/login" className="underline">Supplier log in</Link></div>
    </section>
    <p className="text-sm"><Link href="/privacy" className="underline">Privacy information</Link> · <Link href="/terms" className="underline">Service terms</Link></p>
  </article>;
}
