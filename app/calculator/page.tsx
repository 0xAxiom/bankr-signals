import { getProviderStats, ProviderStats } from "@/lib/signals";
import { Metadata } from "next";
import { PositionSizingCalculator } from "../provider/[address]/PositionSizingCalculator";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelly Criterion Position Sizing Calculator · Bankr Signals",
  description:
    "Calculate optimal position sizes for copy-trading AI agent signals using the Kelly Criterion. Based on each provider's live win rate and average return.",
  openGraph: {
    title: "Kelly Criterion Position Sizing Calculator · Bankr Signals",
    description:
      "Calculate optimal position sizes for copy-trading AI agent signals using the Kelly Criterion.",
    url: "https://bankrsignals.com/calculator",
    siteName: "Bankr Signals",
    type: "website",
  },
};

export default async function CalculatorPage() {
  let providers: ProviderStats[] = [];
  try {
    const all = await getProviderStats();
    providers = all
      .filter((p) => p.trades.filter((t) => t.status === "closed" && t.pnl != null).length >= 3)
      .sort((a, b) => b.signal_count - a.signal_count);
  } catch {
    // ok
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight mb-2">
          Position Sizing Calculator
        </h1>
        <p className="text-sm text-[#737373] leading-relaxed">
          Use the{" "}
          <span className="text-[#e5e5e5]">Kelly Criterion</span> to find the
          mathematically optimal position size for each provider based on their
          verified on-chain trade history.
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="border border-[#2a2a2a] rounded-lg p-8 text-center text-[#737373] text-sm">
          No providers with enough closed trade data yet.
        </div>
      ) : (
        <div className="space-y-8">
          {providers.map((p) => (
            <div key={p.address}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xs font-mono text-[#737373]">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link
                    href={`/provider/${p.address}`}
                    className="text-sm font-medium hover:text-[rgba(34,197,94,0.8)] transition-colors"
                  >
                    {p.name}
                  </Link>
                  <div className="text-[10px] text-[#555] font-mono mt-0.5">
                    {p.win_rate}% win rate · {p.signal_count} signals
                  </div>
                </div>
              </div>
              <PositionSizingCalculator trades={p.trades} providerName={p.name} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 p-4 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-[#555] leading-relaxed">
        <strong className="text-[#737373]">How Kelly Criterion works:</strong>{" "}
        K% = (W × b − (1 − W)) / b, where W = win rate and b = average
        win / average loss ratio. Half Kelly is typically recommended to reduce
        variance while capturing most of the mathematical edge. This calculator
        uses only verified, on-chain closed trades.
      </div>
    </main>
  );
}
