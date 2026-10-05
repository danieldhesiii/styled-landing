import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Marketing shell — wraps the public landing page with the site header, a
// constrained content column and the footer. The /design app lives outside this
// group and runs full-width with its own chrome.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5">{children}</main>
      <SiteFooter />
    </>
  );
}
