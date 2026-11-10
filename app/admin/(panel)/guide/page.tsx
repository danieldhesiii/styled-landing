import Link from "next/link";

export const metadata = { title: "Guide · Styled staff" };
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <details id={id} className="scroll-mt-24 border-t border-sand py-3">
    <summary className="min-h-11 cursor-pointer py-3 font-serif text-2xl text-ink">{title}</summary>
    <div className="space-y-3 pb-4 text-sm leading-relaxed text-ink/70">{children}</div>
  </details>;
}
const CONTENTS = [
  ["big-picture", "Overview"], ["orders", "Orders"], ["pilot-setup", "Pilot and service checks"],
  ["support", "Customer questions"], ["customers", "Customers"], ["vendors", "Applications"],
  ["suppliers", "Suppliers and products"], ["portal", "Supplier access"],
  ["availability", "Availability"], ["shop-rules", "Catalogue rules"],
];
export default function GuidePage() {
  return <div className="max-w-3xl">
    <h1 className="font-serif text-4xl text-ink">Staff guide</h1>
    <p className="mt-3 text-sm text-ink/65">Choose a task for the steps and rules.</p>
    <nav aria-label="Staff tools" className="mt-5 flex flex-wrap gap-x-6 text-sm">
      <Link href="/admin/requests" className="inline-flex min-h-11 items-center underline">Request tracker</Link>
      <Link href="/admin/pilot" className="inline-flex min-h-11 items-center underline">Try the fictional booking flow</Link>
    </nav>
    <nav aria-label="Contents" className="my-5 grid gap-2 text-sm sm:grid-cols-2">
      {CONTENTS.map(([id,label]) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center text-clay underline">{label}</a>)}
    </nav>
    <Section id="big-picture" title="Overview">
      <p>Couples plan events, select products and request supplier confirmation. Staff review suppliers, keep the catalogue current and manage requests through quotes, acceptance and agreed booking arrangements.</p>
      <p>Availability alone does not confirm a booking. Styled does not collect payment in this workflow.</p>
    </Section>
    <Section id="orders" title="Orders">
      <p>Open an item in <Link href="/admin" className="underline">Orders</Link>. Record supplier responses, then use Quote, booking and returns to issue the full quote, check customer acceptance and record agreed offline arrangements.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>Requested:</strong> awaiting review.</li>
        <li><strong>Confirmed:</strong> supplier checks, quote acceptance and offline arrangements are recorded.</li>
        <li><strong>Deposit paid:</strong> a legacy status; check the agreed payment record. Styled does not collect it here.</li>
        <li><strong>Declined / cancelled:</strong> the request is not proceeding.</li>
      </ul>
      <p>Customer messages appear on the request page. Internal notes are staff-only. Review the agreed terms before cancellation or refund decisions.</p>
      <p>Manage queued notifications in Service checks. Provider acceptance is not inbox delivery; uncertain sends need investigation before resending.</p>
    </Section>
    <Section id="support" title="Customer questions">
      <p>Open <Link href="/admin/support" className="underline">Customer questions</Link>, expand a request, write a reply and save its status. Replies appear in the requester’s Your requests area; saving a reply does not automatically email it.</p>
      <p>Staff notification state appears beside the saved request. A failed email does not remove the request. Support messages do not change bookings; handle amendments in order management.</p>
    </Section>
    <Section id="pilot-setup" title="Pilot and service checks">
      <p>Use <Link href="/admin/operations" className="underline">Service checks</Link> for private supplier intake, commercial decisions, connections, notification queues and technical reports.</p>
      <p>Record evidence after completing each check. Intake notes do not publish listings, grant access or contact suppliers. The fictional pilot resets on refresh.</p>
      <p>The test-email action sends to your verified staff account only. Check the actual inbox before recording success. Supplier terms, payment responsibilities and launch checks need separate agreement.</p>
    </Section>
    <Section id="customers" title="Customers">
      <p><Link href="/admin/accounts" className="underline">Customers</Link> is a read-only view of signed-up couples, saved looks, renders and requests. Anonymous guests and staff accounts are excluded.</p>
    </Section>
    <Section id="vendors" title="Applications">
      <ol className="list-decimal space-y-2 pl-5">
        <li>Open <Link href="/admin/vendors" className="underline">Applications</Link> and mark a new submission Reviewing.</li>
        <li>Check the business, area and suitability; contact the applicant if needed.</li>
        <li>Accept or decline. Declining keeps the record.</li>
        <li>For accepted applicants, choose Set up as supplier to open the prefilled profile form.</li>
      </ol>
      <p>Application acceptance does not publish products; the submitted range needs approval.</p>
    </Section>
    <Section id="suppliers" title="Suppliers and products">
      <p>In <Link href="/admin/suppliers" className="underline">Suppliers</Link>, add the business name, area and optional logo. Add draft products with their price, unit, category, quantity rule, capacity and lead time.</p>
      <p>Commission is staff-only and applies to new requests. Leave it blank for the platform default of 12%.</p>
      <p>Suppliers submit prices, photos, terms and permissions from Business setup. Open Range approval and private preview to approve or request changes. Publication and optional AI-reference permissions are separate.</p>
      <p>Material business or product edits require fresh review and may hide listings. Stock-capacity changes remain operational. Supplier and product switches can hide listings; publication still requires approval.</p>
      <p>Approved active suppliers appear in the <Link href="/suppliers" className="underline">public supplier directory</Link>. Their commission is never public.</p>
    </Section>
    <Section id="portal" title="Supplier access">
      <p>Open a supplier and choose Portal logins → Send private invitation. Use an email address approved by that supplier. Email configuration is required.</p>
      <p>New account holders choose their own password. Staff never receive passwords or login tokens. One login belongs to one supplier.</p>
      <p>Suppliers use /portal to manage their products, availability and request lines. They cannot view other suppliers’ lines or internal commission. Confirming availability does not confirm the whole booking.</p>
      <p>Automatic notices depend on the configured provider and sending controls. Review delivery state in Service checks; relay requests manually when sending is unavailable.</p>
    </Section>
    <Section id="availability" title="Availability">
      <p>Use <Link href="/admin/availability" className="underline">Products &amp; availability</Link> to search products, set units per day, block product or supplier dates and inspect recorded stock holds.</p>
      <p>Blank capacity means made to order. Date overrides and existing holds affect availability. Suppliers still check their own bookings, shared stock and crew before confirmation.</p>
    </Section>
    <Section id="shop-rules" title="Catalogue rules">
      <ul className="list-disc space-y-2 pl-5">
        <li>Public products require both the supplier and product to be active, with publication approval.</li>
        <li>Availability uses capacity and date overrides minus recorded stock holds.</li>
        <li>Existing requests retain their recorded prices when catalogue prices change.</li>
        <li>The full quote confirms service fees and separate refundable security; the catalogue shows an item estimate.</li>
      </ul>
    </Section>
  </div>;
}
