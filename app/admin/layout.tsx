import type { Metadata } from "next";

// The staff area is not for search engines.
export const metadata: Metadata = {
  title: "Styled staff",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream text-ink">{children}</div>;
}
