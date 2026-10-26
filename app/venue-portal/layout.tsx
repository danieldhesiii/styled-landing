import SkipLink from "@/components/ui/SkipLink";
import VenueWorkspaceHeader from "@/components/venues/VenueWorkspaceHeader";
export default function VenueWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkipLink />
      <VenueWorkspaceHeader />
      <main id="main-content" className="mx-auto max-w-6xl px-5">{children}</main>
      <footer className="mx-auto mt-12 max-w-6xl border-t border-sand px-5 py-8 text-sm text-ink/60">
        Venue listing or team access help:{" "}
        <a href="mailto:support@styleduk.com" className="underline">
          support@styleduk.com
        </a>
      </footer>
    </>
  );
}
