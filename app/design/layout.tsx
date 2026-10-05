import GuestSession from "@/components/session/GuestSession";
import CatalogueProvider from "@/components/catalogue/CatalogueProvider";

// Gives everything under /design a guest session and the live catalogue, without
// touching the page.
export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestSession>
      <CatalogueProvider>{children}</CatalogueProvider>
    </GuestSession>
  );
}
