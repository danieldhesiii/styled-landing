import InformationPage from "../_components/InformationPage";

export const metadata = {
  title: "Privacy policy · Styled",
  description: "How Styled uses account, event, request and image information, browser storage and optional Pinterest connections, and how to exercise your privacy rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <InformationPage title="Privacy policy" intro="How your information is used when you plan with Styled, send a request or use a business workspace. You can read this page without an account."
    links={[{ href: "#information", label: "Information we use" }, { href: "#providers", label: "Sharing" }, { href: "#cookies", label: "Cookies & storage" }, { href: "#rights", label: "Your rights" }]}>
    <section id="contact"><h2>Contact for privacy questions</h2>
      <p>This notice covers Styled Wedding Planner and this development application. Contact the Styled team at <a href="mailto:support@styleduk.com" className="underline">support@styleduk.com</a> about your information, including access, correction or deletion requests.</p>
    </section>
    <section id="information"><h2>Information we use and why</h2>
      <p>Account information includes your email, sign-in details and account identifier. Event plans, dates, guest counts, budgets, venue choices, baskets, saved items and saved looks let you plan and return to your work. Some drafts and venue shortlists are kept in your browser.</p>
      <p>Product requests and venue enquiries can include names, contact details, event and hire dates, venue or delivery details, selected items and messages. These are used to check availability, prepare quotes and manage your request. Without the required details, we may be unable to process it.</p>
      <p>Photos, reference images and styling instructions are used to create previews. When you use the description helper, your description is sent for AI processing. Avoid unnecessary personal or sensitive information in images and prompts.</p>
      <p>Support messages, topics, references, account email and staff replies are saved so you and authorised staff can follow the question. Business profiles, listing media and contact details are used to manage listings and business access.</p>
      <p>Technical information includes service errors, request identifiers and a hashed network address used for abuse prevention and usage limits. Hosting providers also receive connection information when you visit.</p>
    </section>
    <section id="providers"><h2>Who receives information</h2>
      <p>Authorised Styled staff and the supplier or venue team handling your request can access relevant request details. Public business listing information is visible to visitors. Venue listing media can have public file URLs even before a listing is published; do not upload confidential material there.</p>
      <p>Supabase provides authentication, database and file storage; Vercel hosts the application. AI images and descriptions are processed through the configured AI service, which defaults to OpenAI. Service emails use the configured email provider; the application supports Resend and Brevo. Not every saved request sends an email.</p>
      <p>Public pages load fonts from Google Fonts, which receives connection information such as your IP address. Third-party services may process information outside the UK. Contact support for the providers, processing locations and transfer arrangements relevant to your information.</p>
    </section>
    <section id="pinterest"><h2>Optional Pinterest features</h2>
      <p>Where enabled, connecting Pinterest is optional and read-only. Pinterest handles authorisation; Styled does not collect your Pinterest password or publish, edit or delete your boards or Pins. Styled reads board names and identifiers, Pin identifiers, image titles and addresses, and source links when you request them.</p>
      <p>The connection token is encrypted in a browser cookie for up to one hour, or less if it expires sooner. The sign-in security cookie lasts up to ten minutes. The token is not stored in Styled’s database. Disconnect clears this browser’s connection; you can also revoke access in Pinterest settings.</p>
      <p>Viewing Pinterest content does not itself copy it into Styled storage or send it to the AI service. Image copying and AI reuse have a separate permission control. Upload only images you have permission to use. Opening a Pinterest preview loads content from Pinterest, which handles that visit under its own privacy policy.</p>
    </section>
    <section id="cookies"><h2>Cookies and browser storage</h2>
      <p>Session cookies keep you signed in. Browser storage remembers design drafts and venue shortlists; it remains until it is replaced or cleared. Pinterest cookies support the optional connection described above. Clearing browser data can sign you out and remove local drafts, but does not delete information already saved to your account.</p>
      <p>External fonts and any Pinterest content you choose to open make third-party connections. You can control cookies and storage in your browser settings; blocking session cookies may prevent account features from working.</p>
    </section>
    <section id="retention"><h2>Saved information and deletion</h2>
      <p>Account plans, uploads, requests and support history are stored so you can return to them. Closing a page, signing out or disconnecting Pinterest does not delete saved records. An unsent support draft stays in memory while the page remains open.</p>
      <p>Contact support to request deletion or ask how long particular records are held. A deletion request needs an identity check and review of linked request records and any legal reasons to retain information. Removal from provider backups may take longer than removal from the active service.</p>
    </section>
    <section id="rights"><h2>Your privacy rights</h2>
      <p>Depending on the processing, UK data protection law gives you rights to access and correct your information, request deletion or restriction, object to processing and receive portable information. Where processing relies on consent, you can withdraw it without affecting earlier lawful use.</p>
      <p>Email support with your account email and the information concerned. Do not send passwords or sign-in links. The usual legal response period is one month; identity checks or a permitted extension may affect that period.</p>
      <p>You can raise a privacy concern with us and complain to the <a href="https://ico.org.uk/make-a-complaint/" className="underline">Information Commissioner’s Office (ICO)</a>.</p>
    </section>
  </InformationPage>;
}
