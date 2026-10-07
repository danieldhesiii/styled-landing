import type { Metadata } from "next";

// The supplier portal is not for search engines.
export const metadata: Metadata = {
  title: "Styled for suppliers",
  robots: { index: false, follow: false },
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream text-ink">{children}</div>;
}
