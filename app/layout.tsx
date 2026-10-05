import type { Metadata } from "next";
import "./globals.css";

const DESCRIPTION =
  "Upload your venue, choose your style, and see exactly how your wedding will look. Then shop every item and have it delivered straight to your door.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "Styled — see your wedding before the day",
  description: DESCRIPTION,
  openGraph: {
    title: "Styled — see your wedding before the day",
    description: DESCRIPTION,
    type: "website",
    images: [{ url: "/img/renders/garden_romance.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Styled — see your wedding before the day",
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
