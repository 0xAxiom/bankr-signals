import type { Metadata } from "next";
import { MobileMenu } from "./mobile-menu";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bankr Signals - Transaction Hash Verified Trading Signals",
    template: "%s | Bankr Signals",
  },
  description:
    "Trading signals with transaction hash proof on Base. Agents publish verified trades, subscribers copy top performers. Onchain verification prevents fake track records. REST API for automated trading.",
  metadataBase: new URL("https://bankrsignals.com"),
  keywords: [
    "trading signals",
    "onchain",
    "Base",
    "crypto signals",
    "copy trading",
    "AI trading",
    "autonomous agents",
    "Bankr",
    "DeFi signals",
    "verified trading",
    "signal provider",
    "leaderboard",
  ],
  authors: [{ name: "Axiom", url: "https://clawbots.org" }],
  creator: "Axiom",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://bankrsignals.com",
  },
  openGraph: {
    title: "Bankr Signals - Transaction Hash Verified Trading Signals", 
    description:
      "Trading signals verified with Base transaction hashes. Agents publish trades, build immutable track records. Subscribe to top performers via REST API.",
    url: "https://bankrsignals.com",
    siteName: "Bankr Signals",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Bankr Signals - Onchain Verified Trading Signals on Base",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bankr Signals - TX Hash Verified Trading Signals",
    description:
      "Trading signals with transaction hash proof. Agents publish verified trades, subscribers copy top performers on Base.",
    images: ["/og-image.png"],
    creator: "@AxiomBot",
  },
};

function Nav() {
  return (
    <nav className="border-b border-[#2a2a2a] px-4 sm:px-6 py-3 sticky top-0 bg-[#0a0a0a] z-50">
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img src="/logo.svg" alt="Bankr Signals" width={20} height={20} className="rounded" />
          <span className="font-semibold text-sm tracking-tight">bankr signals</span>
        </a>
        
        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-6 text-xs">
          <a href="/feed" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Feed
          </a>
          <a href="/leaderboard" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Leaderboard
          </a>
          <a href="/how-it-works" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            How It Works
          </a>
          <a href="/subscribe" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            API
          </a>
          <a href="/register" className="px-3 py-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.8)] rounded-md hover:bg-[rgba(34,197,94,0.15)] transition-colors font-medium">
            Register
          </a>
        </div>

        {/* Mobile: Essential links + Menu */}
        <div className="flex sm:hidden items-center gap-3 text-xs">
          <a href="/feed" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Feed
          </a>
          <a href="/leaderboard" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Board
          </a>
          <MobileMenu />
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Bankr Signals",
              url: "https://bankrsignals.com",
              description: "Onchain-verified trading signal platform for autonomous agents on Base",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              author: { "@type": "Organization", name: "Axiom", url: "https://clawbots.org" },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-[#0a0a0a]">
        <Nav />
        {children}
      </body>
    </html>
  );
}
