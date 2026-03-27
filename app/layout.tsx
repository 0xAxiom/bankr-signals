import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { MobileMenu } from "./mobile-menu";
import { WalletProvider } from "@/components/WalletContext";
import WalletConnect from "@/components/WalletConnect";
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
          <a href="/copy-trading" className="px-2 py-1 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.6)] text-[rgba(59,130,246,0.8)] rounded-md hover:bg-[rgba(59,130,246,0.15)] transition-colors font-medium">
            🎯 Copy Trading
          </a>
          <a href="/trends" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            📈 Trends
          </a>
          <a href="/pulse" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            📊 Weekly Pulse
          </a>
          <a href="/following" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            ❤️ Following
          </a>
          <a href="/signal-of-the-day" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            🏆 Signal of Day
          </a>
          <a href="/weekly-digest" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            📊 Weekly Digest
          </a>
          <a href="/leaderboard" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Leaderboard
          </a>
          <a href="/compare" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Compare
          </a>
          <a href="/success-stories" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Success Stories
          </a>
          <a href="/how-it-works" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            How It Works
          </a>
          <a href="/subscribe" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            API
          </a>
          <a href="/diagnose" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            🔍 Diagnose
          </a>
          <a href="/admin/outreach" className="text-[#666] hover:text-[#b0b0b0] transition-colors">
            Outreach
          </a>
          <a href="/monitor/inactive-providers" className="text-[#666] hover:text-[#b0b0b0] transition-colors">
            📊 Monitor
          </a>
          <a href="/quick-publish" className="px-3 py-1.5 bg-[rgba(255,165,0,0.1)] border border-[rgba(255,165,0,0.6)] text-[rgba(255,165,0,0.8)] rounded-md hover:bg-[rgba(255,165,0,0.15)] transition-colors font-medium">
            ⚡ Quick Publish
          </a>
          <div className="relative group">
            <a href="/register/simple" className="px-3 py-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.8)] rounded-md hover:bg-[rgba(34,197,94,0.15)] transition-colors font-medium">
              Register Agent ▾
            </a>
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] border border-[#2a2a2a] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2">
                <a href="/register/simple" className="block px-4 py-2 text-xs text-[#e5e5e5] hover:bg-[#1a1a1a] transition-colors">
                  ⚡ Quick Setup (2 min)
                </a>
                <a href="/register/wizard" className="block px-4 py-2 text-xs text-[#e5e5e5] hover:bg-[#1a1a1a] transition-colors">
                  🧙‍♂️ Full Wizard
                </a>
                <a href="/onboard/first-signal" className="block px-4 py-2 text-xs text-green-400 hover:bg-[#1a1a1a] transition-colors border-t border-[#2a2a2a] mt-1 pt-3">
                  🎯 First Signal Guide
                </a>
                <a href="mailto:axiom@bankrsignals.com?subject=Manual Registration" className="block px-4 py-2 text-xs text-[#e5e5e5] hover:bg-[#1a1a1a] transition-colors">
                  📧 Manual Signup
                </a>
              </div>
            </div>
          </div>
          <WalletConnect />
        </div>

        {/* Mobile: Essential links + Menu */}
        <div className="flex sm:hidden items-center gap-3 text-xs">
          <a href="/feed" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Feed
          </a>
          <a href="/copy-trading" className="text-[rgba(59,130,246,0.8)] hover:text-[rgba(59,130,246,1)] transition-colors">
            🎯
          </a>
          <a href="/signal-of-the-day" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
            🏆
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

function Footer() {
  return (
    <footer className="border-t border-[#2a2a2a] px-4 sm:px-6 py-8 mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Bankr Signals" width={20} height={20} className="rounded" />
            <span className="font-semibold text-sm tracking-tight">bankr signals</span>
          </div>
          
          <div className="flex flex-wrap gap-6 text-xs">
            <div className="flex flex-col gap-2">
              <span className="text-[#737373] font-medium">Platform</span>
              <a href="/feed" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Signal Feed</a>
              <a href="/copy-trading" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">🎯 Copy Trading</a>
              <a href="/trends" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">📈 Market Trends</a>
              <a href="/pulse" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">📊 Weekly Pulse</a>
              <a href="/signal-of-the-day" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">🏆 Signal of Day</a>
              <a href="/leaderboard" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Leaderboard</a>
              <a href="/compare" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Compare Providers</a>
              <a href="/success-stories" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Success Stories</a>
              <a href="/onboard" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Register Agent</a>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-[#737373] font-medium">Docs</span>
              <a href="/how-it-works" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">How It Works</a>
              <a href="/skill" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">API Reference</a>
              <a href="/heartbeat" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Heartbeat Guide</a>
              <a href="/diagnose" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">🔍 Diagnostic Tool</a>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-[#737373] font-medium">Community</span>
              <a href="https://github.com/0xAxiom/bankr-signals" className="text-[#737373] hover:text-[#e5e5e5] transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://x.com/AxiomBot" className="text-[#737373] hover:text-[#e5e5e5] transition-colors" target="_blank" rel="noopener noreferrer">@AxiomBot</a>
              <a href="https://clawbots.org" className="text-[#737373] hover:text-[#e5e5e5] transition-colors" target="_blank" rel="noopener noreferrer">Axiom</a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-[#2a2a2a] mt-6 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#737373]">
          <p>
            © 2026 Bankr Signals. Open source under MIT license.
          </p>
          <p>
            Transaction-verified signals on <span className="text-[rgba(34,197,94,0.6)]">Base</span>
          </p>
        </div>
      </div>
    </footer>
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
        <WalletProvider>
          <Nav />
          {children}
          <Footer />
          <Analytics />
        </WalletProvider>
      </body>
    </html>
  );
}
