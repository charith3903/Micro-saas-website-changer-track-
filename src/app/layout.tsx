import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebMonitor — Track Website Changes & Get Instant Alerts",
  description:
    "Monitor any web page for changes. Get alerted the moment a product restocks, a price drops, a job is posted, or a competitor updates their site. Free to start.",
  keywords: [
    "website monitor",
    "price tracker",
    "restock alert",
    "web change detection",
    "page monitor",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
