import type { Metadata } from "next";
import "./globals.css";

const DESCRIPTION =
  "Explore an illustrative wedding look from your venue photo, build a supplier selection and request manual confirmation and a final quote. Payment and delivery or collection are agreed separately.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      "https://styledukprodprogress.vercel.app",
  ),
  title: "Styled: see your wedding before the day",
  description: DESCRIPTION,
  openGraph: {
    title: "Styled: see your wedding before the day",
    description: DESCRIPTION,
    type: "website",
    images: [{ url: "/img/renders/garden_romance.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Styled: see your wedding before the day",
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
