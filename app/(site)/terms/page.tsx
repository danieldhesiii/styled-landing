import Link from "next/link";
import InformationPage from "../_components/InformationPage";

export const metadata = {
  title: "Service terms · Styled",
  description: "Using Styled’s planning and manual request service: estimates, quotes, booking arrangements, cancellations and image permissions.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <InformationPage title="Service terms" intro="These terms describe the current planning and manual request service. Read the written quote and booking terms for your particular products or venue before agreeing to a booking."
    links={[{ href: "#requests", label: "Requests & quotes" }, { href: "#arrangements", label: "Booking arrangements" }, { href: "#changes", label: "Changes & cancellations" }, { href: "#content", label: "Images & account use" }]}>
    <section id="requests"><h2>Planning, requests and quotes</h2>
      <p>Styled helps you explore venues, plan an event, save ideas and request products. Saving a plan, generating a preview or adding items to a basket does not reserve stock or a date.</p>
      <p>Product requests are checked manually with suppliers. Catalogue prices and planning totals are estimates until a written quote confirms the items, dates, service costs and applicable taxes. Submitting a request takes no payment.</p>
      <p>Accepting a quote in Styled records your acceptance and asks for booking confirmation. It does not collect payment or automatically confirm a supplier booking. Check the current quote, request status and written confirmation.</p>
      <p>A venue viewing request asks for an appointment. It does not reserve an event date. Venue enquiries and product requests are separate; agreement with a venue does not confirm product availability.</p>
    </section>
    <section id="arrangements"><h2>Before agreeing to a booking</h2>
      <p>The written booking arrangements should identify the business you are contracting with for each product or venue service and who invoices you and receives payment. Sending a request through Styled does not authorise Styled to commit a supplier or venue on your behalf.</p>
      <p>Check whether products are for hire or sale, the quantities, specifications, hire period, total price, delivery coverage, setup and collection. Agree arrival deadlines, access requirements and responsibilities in writing.</p>
      <p>Check any reservation deposit, balance due date, refundable security, inspection process, damage or loss charges and late return arrangements in those terms. A planning estimate is not an invoice, payment deadline or agreed charge. Styled does not collect online payments through this request service.</p>
    </section>
    <section id="changes"><h2>Changes, cancellations and problems</h2>
      <p>Contact the business named in your booking arrangements about a change, cancellation, refund or problem with supplied items. You can also <Link href="/support" className="underline">ask Styled for help</Link> with your reference. A cancellation request in Styled is recorded for review; it does not automatically cancel a booking or issue a refund.</p>
      <p>Cancellation rights depend on the type of goods or services and the circumstances. Check the booking terms before agreeing; do not assume that every wedding-related booking has the same cooling-off period or that every deposit is non-refundable.</p>
      <p>Nothing in these service terms removes your statutory consumer rights. Booking terms and charges must comply with applicable consumer law.</p>
    </section>
    <section id="content"><h2>Images and account use</h2>
      <p>AI previews are inspiration. Colours, proportions, quantities, room features and products may differ from reality. Check actual listing specifications, dimensions and supplier photographs, and confirm essential requirements in writing.</p>
      <p>Upload or reuse only content you have permission to use, including for AI processing when you request a preview. A Pinterest link or public image is not itself permission to copy or reuse it. Avoid unnecessary personal information in images and prompts.</p>
      <p>Keep sign-in details secure and provide accurate request information. Do not access another person’s account or business records. Supplier and venue workspaces require separately linked business access.</p>
      <p>For complaints, access difficulties or questions about these terms, <Link href="/service-info#support" className="underline">contact Styled support</Link>.</p>
    </section>
  </InformationPage>;
}
