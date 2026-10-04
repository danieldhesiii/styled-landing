import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const DESCRIPTION =
  "Styled is the planning & design workspace for wedding planners — design each wedding, build a costed supplier plan, run the timeline, guest list and seating, and share it all with your couples.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "Styled — the wedding planning & design workspace",
  description: DESCRIPTION,
  openGraph: {
    title: "Styled — the wedding planning & design workspace",
    description: DESCRIPTION,
    type: "website",
    images: [{ url: "/img/renders/garden_romance.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Styled — the wedding planning & design workspace",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
