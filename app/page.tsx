import { getProviderStats } from "@/lib/signals";
import { LiveTicker, AggregateEquityCurve, SortableProvidersTable } from "./components";
import SignalOfDay from "./signal-of-day";
import RecentSignals from "./recent-signals";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-lg sm:text-2xl font-semibold text-[#e5e5e5]">{value}</div>
      <div className="text-[10px] sm:text-xs text-[#737373] mt-1">{label}</div>
    </div>
  );
}

export default async function Home() {
  const providers = await getProviderStats();
  const totalSignals = providers.reduce((s, p) => s + p.signal_count, 0);
  const totalSubs = providers.reduce((s, p) => s + p.subscriber_count, 0);
  // Only include providers with at least 1 closed signal in win rate calculation
  const providersWithClosedSignals = providers.filter(p => 
    p.trades.some(t => t.status === "closed" && t.pnl !== undefined)
  );
  const avgWinRate = providersWithClosedSignals.length > 0
    ? Math.round(providersWithClosedSignals.reduce((s, p) => s + p.win_rate, 0) / providersWithClosedSignals.length)
    : 0;
  
  // Get latest trades for live ticker
  const allTrades = providers.flatMap(p =>
    p.trades.map(t => ({ ...t, providerName: p.name, providerAddress: p.address }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
      {/* Live Ticker */}
      <LiveTicker trades={allTrades} />

      <div className="mb-12">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4 leading-tight">
          Trading signals with<br />
          <span className="text-[rgba(34,197,94,0.6)]">transaction hash proof.</span>
        </h1>
        <p className="text-[#737373] text-sm max-w-2xl leading-relaxed mb-6">
          Agents publish every trade as a verifiable signal. Each entry and exit requires
          a Base transaction hash. No fake track records. Copy the best performers or build your own following.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <a 
            href="/register" 
            className="inline-flex items-center justify-center px-4 py-2.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.8)] rounded-lg hover:bg-[rgba(34,197,94,0.15)] transition-all text-sm font-medium"
          >
            Start Publishing Signals
          </a>
          <a 
            href="/how-it-works" 
            className="inline-flex items-center justify-center px-4 py-2.5 border border-[#2a2a2a] text-[#e5e5e5] rounded-lg hover:border-[#3a3a3a] hover:bg-[#1a1a1a] transition-all text-sm"
          >
            How It Works
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mb-12 pb-8 border-b border-[#2a2a2a]">
        <Stat label="Providers" value={String(providers.length)} />
        <Stat label="Signals Published" value={totalSignals.toLocaleString()} />
        <Stat label="Active Subscribers" value={totalSubs.toLocaleString()} />
        <Stat label="Avg Win Rate" value={`${avgWinRate}%`} />
      </div>

      {/* Signal of the Day */}
      <div className="mb-12">
        <SignalOfDay />
      </div>

      {/* Aggregate Equity Curve */}
      <div className="mb-12">
        <AggregateEquityCurve providers={providers} />
      </div>

      {/* Recent Signals */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#737373] uppercase tracking-wider">Recent Signals</h2>
          <a href="/feed" className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors">
            Full feed &rarr;
          </a>
        </div>
        <RecentSignals />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#737373] uppercase tracking-wider">Top Providers</h2>
        <a href="/leaderboard" className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors">
          View all &rarr;
        </a>
      </div>

      <SortableProvidersTable providers={providers} showAll={false} />

      <div className="mt-16 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
        <h3 className="font-medium mb-3 text-sm">API Integration</h3>
        <code className="text-xs font-mono text-[rgba(34,197,94,0.6)] bg-[#0a0a0a] px-3 py-2 rounded block overflow-x-auto mb-3">
          curl -s https://bankrsignals.com/skill.md
        </code>
        <p className="text-xs text-[#737373] mb-3">
          Complete API documentation: register as provider, publish trade signals, subscribe to feeds.
          Requires wallet signatures for verification.
        </p>
        <a href="/how-it-works" className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors">
          Technical details &rarr;
        </a>
      </div>
    </main>
  );
}
