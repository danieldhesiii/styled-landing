import Link from "next/link";

// Staff handbook: how Styled works end to end and how to run each admin screen.
// This is the single source of truth for the team — keep it updated as features
// change (it lives in the repo, so edits ship with the code that changed).

export const metadata = { title: "Guide · Styled staff" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-sand pt-8">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/70">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-cream">{n}</span>
      <span>{children}</span>
    </li>
  );
}

const CONTENTS = [
  ["big-picture", "The big picture"],
  ["orders", "Orders"],
  ["customers", "Customers"],
  ["vendors", "Vendors — applications"],
  ["suppliers", "Suppliers — onboarding & catalogue"],
  ["availability", "Availability"],
  ["shop-rules", "What the shop shows (and why)"],
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl text-ink">How Styled works</h1>
      <p className="mt-2 text-sm text-ink/50">
        A quick handbook for the team. Each section matches a tab in the staff area.
      </p>

      {/* Contents */}
      <nav aria-label="Contents" className="mt-6 rounded-2xl border border-sand bg-white p-5">
        <p className="text-xs uppercase tracking-wider text-ink/40">On this page</p>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {CONTENTS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-clay hover:underline">{label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8">
        <Section id="big-picture" title="The big picture">
          <p>Styled is a wedding visualiser and marketplace. Couples design their wedding against a photo of their venue, then order the real products in the picture. Two sides meet in this admin:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Couples</strong> upload a venue, pick pieces from the catalogue, generate a styled preview, and place an order — which starts as a <em>request</em>, not a payment.</li>
            <li><strong>Suppliers</strong> apply to join, you review and onboard them, and their products become the catalogue couples shop from.</li>
          </ul>
          <p>Your job in the middle: bring good suppliers on, keep their catalogue and availability honest, and move each order from request to confirmed to delivered.</p>
        </Section>

        <Section id="orders" title="Orders">
          <p>The <Link href="/admin" className="text-clay hover:underline">Orders</Link> tab is the main queue. An order is a couple&apos;s request to book a basket of products for their wedding date.</p>
          <p className="font-medium text-ink">Status meanings</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Requested</strong> — just placed; no supplier has confirmed yet.</li>
            <li><strong>Confirmed</strong> — you&apos;ve confirmed the suppliers can fulfil it for the date.</li>
            <li><strong>Deposit paid</strong> — the couple has secured it with their 25% deposit.</li>
            <li><strong>Declined / Cancelled</strong> — not going ahead (a supplier can&apos;t do it, or the couple pulled out).</li>
          </ul>
          <p>Open an order to confirm or decline each supplier line, leave internal staff notes, and write a message the couple sees on their order-tracking page. No money is taken when the order is placed — the deposit secures the date once suppliers are confirmed.</p>
        </Section>

        <Section id="customers" title="Customers">
          <p>The <Link href="/admin/accounts" className="text-clay hover:underline">Customers</Link> tab lists couples who created an account, with how active each is (saved looks, renders, orders). Anonymous guests and staff accounts are left out. It&apos;s read-only — a pulse on who&apos;s using the product.</p>
        </Section>

        <Section id="vendors" title="Vendors — applications">
          <p>Suppliers apply through the public <Link href="/vendors" className="text-clay hover:underline">&ldquo;List your business&rdquo;</Link> form. Their applications land in the <Link href="/admin/vendors" className="text-clay hover:underline">Vendors</Link> tab. Work each one through the pipeline:</p>
          <ol className="space-y-2">
            <Step n="1"><strong>New</strong> — just came in. Read it, then mark it <strong>Reviewing</strong> while you check them out (website, area, fit).</Step>
            <Step n="2"><strong>Reviewing</strong> — doing your due diligence. Contact them if needed; their email and website are one click away.</Step>
            <Step n="3"><strong>Accept</strong> or <strong>Decline</strong> — your decision. Declining keeps the record but closes it (they can re-apply later).</Step>
            <Step n="4">On an accepted application, hit <strong>&ldquo;Set up as supplier →&rdquo;</strong>. That opens the Suppliers create form, prefilled with their details, so you can turn them into a live listing.</Step>
          </ol>
          <p className="text-ink/50">There is deliberately no way to become a supplier without you accepting them here.</p>
        </Section>

        <Section id="suppliers" title="Suppliers — onboarding & catalogue">
          <p>The <Link href="/admin/suppliers" className="text-clay hover:underline">Suppliers</Link> tab is where a supplier becomes a real, shoppable listing. This is the only place to add catalogue products — no code needed.</p>
          <p className="font-medium text-ink">Create a supplier</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Name &amp; area</strong> — shown to couples alongside each product.</li>
            <li><strong>Logo</strong> — a URL to their logo (optional; an initial is shown if blank).</li>
            <li><strong>Commission %</strong> — Styled&apos;s cut on their products. Leave blank to use the platform default (12%). This is internal and never shown to couples. It&apos;s applied to <em>new</em> orders.</li>
          </ul>
          <p className="font-medium text-ink">Add products</p>
          <p>Open a supplier and add each piece. Key fields:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Category</strong> — which part of the shop it appears in.</li>
            <li><strong>Price &amp; unit</strong> — e.g. £45 &ldquo;per table&rdquo;.</li>
            <li><strong>Quantity worked out</strong> — fixed, per guest, per table, or one per venue. This sets the suggested quantity from the couple&apos;s guest count.</li>
            <li><strong>Units per day (capacity)</strong> — how many they can supply on any one date. Leave blank for made-to-order (not stock-limited). This feeds availability.</li>
            <li><strong>Shown in the render</strong> — if it has a render slot, it can appear in the generated preview; otherwise it&apos;s shop-only (e.g. attire, cake).</li>
            <li><strong>Styles</strong> — which look(s) it suits, so the visualiser picks it for matching designs.</li>
          </ul>
          <p className="font-medium text-ink">Switches</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>A supplier&apos;s <strong>Active</strong> toggle hides or shows <em>all</em> their products at once.</li>
            <li>Each product has its own <strong>Live / Hidden</strong> toggle.</li>
          </ul>
          <p className="font-medium text-ink">Public profile</p>
          <p>Every active supplier gets a public page at <strong>/suppliers/&lt;id&gt;</strong>, listed in the <Link href="/suppliers" className="text-clay hover:underline">Meet our suppliers</Link> directory. It shows their logo, area and every live piece — handy to share when onboarding them (&ldquo;here&apos;s your page on Styled&rdquo;). Switching a supplier or product off removes it from there too. Commission is never shown.</p>
        </Section>

        <Section id="availability" title="Availability">
          <p>The <Link href="/admin/availability" className="text-clay hover:underline">Availability</Link> tab manages what can be booked on which dates. Set a product&apos;s day-to-day capacity, block specific dates for a product or a whole supplier (holidays, maintenance), and see what&apos;s already reserved by live orders. The checkout and order engine use exactly this, so the shop can never over-book a supplier for a date.</p>
        </Section>

        <Section id="shop-rules" title="What the shop shows (and why)">
          <p>A product appears to couples only when <strong>both</strong> the product and its supplier are <strong>active</strong>. Beyond that:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Stock label</strong> comes from capacity: blank capacity shows as &ldquo;made to order&rdquo;; a number means it&apos;s stock-limited per day.</li>
            <li><strong>Availability on a date</strong> = capacity (or a day override) minus what live orders have already reserved, after any blocks.</li>
            <li><strong>Commission</strong> is added per line from the supplier&apos;s rate (or the default) — it&apos;s Styled&apos;s margin, recorded on the order, never shown to the couple.</li>
            <li>Prices are snapshotted onto an order when it&apos;s placed, so later catalogue edits never change an existing order.</li>
          </ul>
        </Section>
      </div>

      <p className="mt-10 border-t border-sand pt-6 text-xs text-ink/40">
        Keep this current: when a workflow changes, update this page in the same change so the team always has the real picture.
      </p>
    </div>
  );
}
