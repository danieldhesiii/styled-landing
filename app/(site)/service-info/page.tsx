import Link from "next/link";
import InformationPage from "../_components/InformationPage";

export const metadata = {
  title: "Service information & support · Styled",
  description: "How product requests, venue enquiries, quotes, payment arrangements and support work in Styled.",
  alternates: { canonical: "/service-info" },
};

export default function ServiceInfoPage() {
  return <InformationPage title="Service information & support" intro="Plan your event, explore venues and choose products. Availability and booking arrangements are checked manually before you rely on them."
    links={[{ href: "#products", label: "Product requests" }, { href: "#venues", label: "Venue enquiries" }, { href: "#images", label: "AI previews" }, { href: "#support", label: "Contact & complaints" }]}>
    <section id="products"><h2>From product selection to booking</h2>
      <ol className="list-decimal space-y-3 pl-6">
        <li>Choose products, quantities and the dates you need them. Submit your selection for supplier review.</li>
        <li>Suppliers check availability manually. Review the written quote, including delivery, setup, collection, hire duration and any deposit or security arrangements.</li>
        <li>If you accept a quote, booking confirmation is still a separate step. Agree who supplies the service, who receives payment and the booking terms in writing.</li>
      </ol>
      <p>A request does not reserve stock or take payment. Catalogue totals are estimates; Styled does not collect online payments through this request service.</p>
      <p>For a change, cancellation or problem, contact the business named in your booking arrangements or ask support with your reference. A cancellation request does not automatically cancel a booking or issue a refund.</p>
    </section>
    <section id="venues"><h2>Venue enquiries are separate</h2>
      <p>A viewing request asks for an appointment, not a reservation for your event. An event enquiry also needs the venue’s response and agreed booking arrangements. Check the venue’s inclusions, restrictions, price and cancellation terms.</p>
      <p>Venue agreement does not confirm products from suppliers. Demo venues are examples and cannot be booked.</p>
      <Link href="/venues" className="inline-flex min-h-11 items-center underline underline-offset-4">Find venues</Link>
    </section>
    <section id="images"><h2>AI previews and product details</h2>
      <p>Generated looks help you explore ideas. They can change colours, proportions, quantities and room or product details. They do not confirm stock or guarantee an exact result.</p>
      <p>Check actual dimensions, materials, hire units and supplier photographs. Upload only images you have permission to use. Showcase images are styling examples, not evidence of verified customer reviews.</p>
    </section>
    <section id="support"><h2>Contact support or make a complaint</h2>
      <Link href="/support" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2 text-sm text-cream hover:bg-ink/90">Ask a question or report a problem</Link>
      <p>Use a confirmed account to send a message and check staff replies in Your requests. A saved reference confirms receipt in Styled; it does not confirm email delivery.</p>
      <p>If you cannot sign in or prefer email, contact <a href="mailto:support@styleduk.com" className="underline">support@styleduk.com</a>. Include your account email, request reference or listing name, and what you need help with. For a complaint, explain what happened and the outcome you are seeking.</p>
      <p>If a page or form is difficult to use, tell us which page and what help or format you need. You can use email instead of the form.</p>
      <p>Never send passwords, recovery links, card details or sign-in codes. Hide private details in screenshots.</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Link href="/auth/recovery" className="inline-flex min-h-11 items-center underline">Recover account access</Link>
        <Link href="/login?mode=login" className="inline-flex min-h-11 items-center underline">Log in</Link>
      </div>
    </section>
  </InformationPage>;
}
