import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PortfolioTracker — Stock Portfolio Dashboard",
  description: "Clean portfolio tracker with live prices, P&L calculations, sell targets, and watchlist. Track your stock positions in real-time.",
  openGraph: {
    title: "PortfolioTracker — Stock Portfolio Dashboard",
    description: "Clean portfolio tracker with live prices, P&L calculations, sell targets, and watchlist.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PortfolioTracker — Stock Portfolio Dashboard",
    description: "Clean portfolio tracker with live prices, P&L calculations, sell targets, and watchlist.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
