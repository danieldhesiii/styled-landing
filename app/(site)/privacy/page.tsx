import Link from "next/link";
export const metadata = { title: "Privacy information · Styled" };
export default function PrivacyPage() {
  return <article className="mx-auto max-w-3xl space-y-8 py-12 text-ink/80">
    <h1 className="font-serif text-4xl text-ink">Privacy information</h1>
    <p>This page explains the information used by the current Styled service. If you need more detail before sharing personal information, contact <a href="mailto:support@styleduk.com" className="underline">support@styleduk.com</a>.</p>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Account and planning information</h2>
      <p>Account access uses your email address and authentication credentials through Supabase Auth. Session cookies keep you signed in. Your wedding details, basket, saved looks, boards, uploaded photos and generated images may be stored with your account so you can return to them.</p>
      <p>Requests can include your names, email, venue, wedding or delivery dates, selected items and messages. Styled uses these details to check availability, manage the request and contact you. Relevant request details are made available to the supplier or venue team handling the request.</p>
    </section>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Photos, generated images and service providers</h2>
      <p>When you generate a look, selected images and styling instructions are sent to the image-generation service configured for Styled. Supabase provides account, database and file-storage functions; hosting and email services also process information needed to run the service.</p>
      <p>Upload only photos you have permission to use. Avoid including faces, names, addresses or other sensitive information in photos and prompts where they are not needed. Contact support if you need details of the current providers or their processing arrangements.</p>
      <p>Venue listing media can have publicly accessible file URLs even while the listing is unpublished. An unpublished listing does not make its uploaded files private. Do not upload confidential material as listing media.</p>
    </section>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Support messages</h2><p>If you contact support through the website, your message, chosen topic, optional request or listing reference and verified account email are sent to Styled through its email service. The team uses them to respond by email. An unsent support draft is kept in memory while the page remains open; it is not saved as a support ticket in your account.</p></section>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Browser storage and access</h2>
      <p>The service uses cookies and browser storage for account sessions and workspace behaviour. Clearing browser data can sign you out and can remove local drafts or guest access. Save important work to your account and keep your recovery email secure.</p>
      <p>Business users should keep listing and contact information appropriate for publication. A private customer board is different from media uploaded for a public business listing.</p>
    </section>
    <section className="space-y-3"><h2 className="font-serif text-2xl text-ink">Questions, corrections and deletion requests</h2>
      <p>Contact support to ask what information is held about you, request a correction or deletion, or ask about retention and service providers. Include your account email and the relevant request or listing reference, without sending passwords or sign-in links. Identity and any information that needs to remain for an existing request will need to be checked.</p>
      <p>This page does not specify a fixed retention period or promise immediate removal from provider backups. Ask support about your particular information before relying on a deletion or confidentiality assumption.</p>
    </section>
    <p className="text-sm"><Link href="/service-info#support" className="underline">Support and service information</Link> · <Link href="/terms" className="underline">Service terms</Link></p>
  </article>;
}
