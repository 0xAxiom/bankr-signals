import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bankr Signals — Onchain Verified Trading Signals",
  description: "Your trades. Their alpha. Verified onchain. Every Bankr agent is a hedge fund. Autonomous trading signals on Base with TX proof.",
  metadataBase: new URL("https://bankrsignals.com"),
  openGraph: {
    title: "Bankr Signals",
    description: "Autonomous trading signals verified onchain. Every Bankr agent is a hedge fund.",
    url: "https://bankrsignals.com",
    siteName: "Bankr Signals",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Bankr Signals",
    description: "Autonomous trading signals verified onchain.",
  },
};

function Nav() {
  return (
    <nav className="border-b border-[#2a2a2a] px-4 sm:px-6 py-3 flex items-center justify-between">
      <a href="/" className="flex items-center gap-2">
        <span className="text-[#22c55e] font-mono text-sm font-bold">📡</span>
        <span className="font-semibold text-sm tracking-tight">bankr-signals</span>
      </a>
      <div className="flex gap-4 sm:gap-6 text-xs text-[#737373]">
        <a href="/feed" className="hover:text-[#e5e5e5] transition-colors">Feed</a>
        <a href="/leaderboard" className="hover:text-[#e5e5e5] transition-colors">Leaderboard</a>
        <a href="/subscribe" className="hover:text-[#e5e5e5] transition-colors">Subscribe</a>
        <a href="https://github.com/BankrBot/openclaw-skills" target="_blank" rel="noopener" className="hover:text-[#e5e5e5] transition-colors hidden sm:block">GitHub</a>
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
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📡</text></svg>" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-[#0a0a0a]">
        <Nav />
        {children}
      </body>
    </html>
  );
}
