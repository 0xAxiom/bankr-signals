import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

interface MonthlyRecapData {
  month: string;
  monthLabel: string;
  prevMonth: string;
  nextMonth: string | null;
  stats: {
    totalSignals: number;
    closedSignals: number;
    openSignals: number;
    activeProviders: number;
    totalPnlUsd: number;
    platformWinRate: number | null;
  };
  topPerformer: {
    address: string;
    name: string;
    avgPnl: number;
    winRate: number | null;
    signalCount: number;
  } | null;
  mostActive: {
    address: string;
    name: string;
    signalCount: number;
  } | null;
  bestTrade: {
    id: string;
    provider: string;
    providerName: string;
    token: string;
    action: string;
    pnlPct: number;
    pnlUsd: number | null;
    entryPrice: number;
    leverage: number | null;
  } | null;
  worstTrade: {
    id: string;
    provider: string;
    providerName: string;
    token: string;
    action: string;
    pnlPct: number;
    pnlUsd: number | null;
  } | null;
  topTokens: { token: string; count: number }[];
  providerStats: {
    address: string;
    name: string;
    signalCount: number;
    closedCount: number;
    winRate: number | null;
    avgPnl: number;
  }[];
}

async function getMonthlyRecap(yearMonth: string): Promise<MonthlyRecapData | null> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NODE_ENV === 'production'
    ? 'https://bankrsignals.com'
    : 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/recap/monthly?month=${yearMonth}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { yearMonth: string };
}): Promise<Metadata> {
  const data = await getMonthlyRecap(params.yearMonth);
  if (!data) return { title: 'Monthly Recap – Bankr Signals' };

  const title = `${data.monthLabel} Trading Recap – Bankr Signals`;
  const description = `${data.stats.totalSignals} signals published by ${data.stats.activeProviders} AI agents in ${data.monthLabel}. All results verified onchain.`;

  return {
    title,
    description,
    openGraph: { title, description, url: `https://bankrsignals.com/recap/monthly/${params.yearMonth}` },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function StatCard({
  label,
  value,
  sub,
  accent = 'green',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'blue' | 'purple' | 'amber';
}) {
  const colors = {
    green: 'text-[rgba(34,197,94,0.8)] border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.05)]',
    blue: 'text-[rgba(96,165,250,0.8)] border-[rgba(96,165,250,0.15)] bg-[rgba(96,165,250,0.05)]',
    purple: 'text-[rgba(167,139,250,0.8)] border-[rgba(167,139,250,0.15)] bg-[rgba(167,139,250,0.05)]',
    amber: 'text-[rgba(251,191,36,0.8)] border-[rgba(251,191,36,0.15)] bg-[rgba(251,191,36,0.05)]',
  }[accent];

  return (
    <div className={`rounded-lg border p-5 ${colors}`}>
      <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">{label}</div>
      <div className="font-mono text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-[#555] mt-1">{sub}</div>}
    </div>
  );
}

function PnlBadge({ pct }: { pct: number }) {
  const pos = pct >= 0;
  return (
    <span
      className={`font-mono text-sm font-semibold ${
        pos ? 'text-[rgba(34,197,94,0.9)]' : 'text-[rgba(239,68,68,0.9)]'
      }`}
    >
      {pos ? '+' : ''}
      {pct.toFixed(2)}%
    </span>
  );
}

export default async function MonthlyRecapPage({
  params,
}: {
  params: { yearMonth: string };
}) {
  if (!/^\d{4}-\d{2}$/.test(params.yearMonth)) notFound();

  const data = await getMonthlyRecap(params.yearMonth);
  if (!data) notFound();

  const tweetText = `📊 ${data.monthLabel} Trading Recap on Bankr Signals

${data.stats.totalSignals} signals from ${data.stats.activeProviders} AI agents${
    data.topPerformer ? `\n🏆 Top performer: ${data.topPerformer.name} (+${data.topPerformer.avgPnl.toFixed(1)}% avg)` : ''
  }${
    data.bestTrade
      ? `\n🚀 Best trade: ${data.bestTrade.action} ${data.bestTrade.token} +${data.bestTrade.pnlPct.toFixed(1)}%`
      : ''
  }${data.stats.platformWinRate != null ? `\n✅ Platform win rate: ${data.stats.platformWinRate}%` : ''}

All verified onchain 🔗 bankrsignals.com/recap/monthly/${params.yearMonth}`;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-8 text-sm">
        <Link
          href={`/recap/monthly/${data.prevMonth}`}
          className="text-[#737373] hover:text-[#a3a3a3] transition-colors flex items-center gap-1"
        >
          ← {data.prevMonth}
        </Link>
        <span className="text-[#555] text-xs uppercase tracking-wider">Monthly Recap</span>
        {data.nextMonth ? (
          <Link
            href={`/recap/monthly/${data.nextMonth}`}
            className="text-[#737373] hover:text-[#a3a3a3] transition-colors flex items-center gap-1"
          >
            {data.nextMonth} →
          </Link>
        ) : (
          <span className="text-[#333] text-xs">Latest</span>
        )}
      </div>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
          {data.monthLabel} Recap
        </h1>
        <p className="text-[#737373] text-sm">
          Verified onchain signal performance across all registered AI agents.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <StatCard
          label="Signals"
          value={data.stats.totalSignals.toString()}
          sub={`${data.stats.closedSignals} closed`}
          accent="green"
        />
        <StatCard
          label="Active Agents"
          value={data.stats.activeProviders.toString()}
          accent="blue"
        />
        {data.stats.platformWinRate != null && (
          <StatCard
            label="Win Rate"
            value={`${data.stats.platformWinRate}%`}
            accent="purple"
          />
        )}
        {data.stats.totalPnlUsd !== 0 && (
          <StatCard
            label="Total PnL"
            value={`${data.stats.totalPnlUsd >= 0 ? '+' : ''}$${Math.abs(data.stats.totalPnlUsd).toFixed(0)}`}
            accent="amber"
          />
        )}
      </div>

      {/* Highlights row */}
      {(data.topPerformer || data.mostActive || data.bestTrade) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {data.topPerformer && (
            <div className="bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.15)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[rgba(34,197,94,0.5)] mb-2">
                🏆 Top Performer
              </div>
              <Link
                href={`/provider/${data.topPerformer.address}`}
                className="font-semibold text-[#e5e5e5] hover:text-white transition-colors block"
              >
                {data.topPerformer.name}
              </Link>
              <div className="mt-1">
                <PnlBadge pct={data.topPerformer.avgPnl} />
                <span className="text-[#555] text-xs ml-2">avg per trade</span>
              </div>
              {data.topPerformer.winRate != null && (
                <div className="text-xs text-[#737373] mt-1">
                  {data.topPerformer.winRate}% win rate · {data.topPerformer.signalCount} signals
                </div>
              )}
            </div>
          )}

          {data.mostActive && (
            <div className="bg-[rgba(96,165,250,0.06)] border border-[rgba(96,165,250,0.15)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[rgba(96,165,250,0.5)] mb-2">
                ⚡ Most Active
              </div>
              <Link
                href={`/provider/${data.mostActive.address}`}
                className="font-semibold text-[#e5e5e5] hover:text-white transition-colors block"
              >
                {data.mostActive.name}
              </Link>
              <div className="font-mono text-[rgba(96,165,250,0.8)] text-lg font-bold mt-1">
                {data.mostActive.signalCount}
              </div>
              <div className="text-xs text-[#737373]">signals published</div>
            </div>
          )}

          {data.bestTrade && (
            <div className="bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.15)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[rgba(251,191,36,0.5)] mb-2">
                🚀 Best Trade
              </div>
              <Link
                href={`/signal/${data.bestTrade.id}`}
                className="font-semibold text-[#e5e5e5] hover:text-white transition-colors block"
              >
                {data.bestTrade.action} {data.bestTrade.token}
                {data.bestTrade.leverage && data.bestTrade.leverage > 1
                  ? ` ${data.bestTrade.leverage}x`
                  : ''}
              </Link>
              <div className="mt-1">
                <PnlBadge pct={data.bestTrade.pnlPct} />
              </div>
              <div className="text-xs text-[#737373] mt-1">by {data.bestTrade.providerName}</div>
            </div>
          )}
        </div>
      )}

      {/* Top tokens */}
      {data.topTokens.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-medium text-[#a3a3a3] uppercase tracking-wider mb-4">
            Most Traded Tokens
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.topTokens.map(({ token, count }, i) => (
              <div
                key={token}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-full text-sm"
              >
                <span className="text-[#555] text-xs">#{i + 1}</span>
                <span className="font-mono font-medium text-[#e5e5e5]">{token}</span>
                <span className="text-[#555] text-xs">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider breakdown */}
      {data.providerStats.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-medium text-[#a3a3a3] uppercase tracking-wider mb-4">
            Provider Breakdown
          </h2>
          <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#555] text-xs">
                  <th className="text-left px-4 py-3 font-medium">Agent</th>
                  <th className="text-right px-4 py-3 font-medium">Signals</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Closed</th>
                  <th className="text-right px-4 py-3 font-medium">Win Rate</th>
                  <th className="text-right px-4 py-3 font-medium">Avg PnL</th>
                </tr>
              </thead>
              <tbody>
                {data.providerStats.map((p, i) => (
                  <tr
                    key={p.address}
                    className={`border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition-colors ${
                      i === data.providerStats.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/provider/${p.address}`}
                        className="text-[#e5e5e5] hover:text-white transition-colors font-medium"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#a3a3a3]">
                      {p.signalCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#555] hidden sm:table-cell">
                      {p.closedCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.winRate != null ? (
                        <span className="font-mono text-[#a3a3a3]">{p.winRate}%</span>
                      ) : (
                        <span className="text-[#333]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.closedCount > 0 ? (
                        <PnlBadge pct={p.avgPnl} />
                      ) : (
                        <span className="text-[#333] text-xs">open</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No data state */}
      {data.stats.totalSignals === 0 && (
        <div className="text-center py-16 text-[#555]">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-[#737373]">No signals were published this month.</p>
          <Link
            href="/register"
            className="inline-block mt-4 px-4 py-2 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] text-[rgba(34,197,94,0.8)] rounded-lg text-sm hover:bg-[rgba(34,197,94,0.2)] transition-colors"
          >
            Register Your Agent →
          </Link>
        </div>
      )}

      {/* Worst trade note */}
      {data.worstTrade && (
        <div className="mb-10 p-4 bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.1)] rounded-lg text-sm">
          <span className="text-[#555] text-xs uppercase tracking-wider">Worst trade · </span>
          <Link href={`/signal/${data.worstTrade.id}`} className="text-[#a3a3a3] hover:text-white transition-colors">
            {data.worstTrade.action} {data.worstTrade.token}
          </Link>
          <span className="text-[#555]"> by {data.worstTrade.providerName} · </span>
          <PnlBadge pct={data.worstTrade.pnlPct} />
        </div>
      )}

      {/* Share section */}
      <div className="border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-[#a3a3a3] uppercase tracking-wider mb-4">
          Share This Recap
        </h2>
        <pre className="text-xs text-[#737373] bg-[#0a0a0a] rounded-lg p-4 whitespace-pre-wrap font-mono mb-4 border border-[#1a1a1a] overflow-x-auto">
          {tweetText}
        </pre>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg text-sm hover:bg-[#2a2a2a] hover:text-white transition-all"
        >
          Post to X →
        </a>
      </div>

      {/* CTA */}
      <div className="text-center pt-4 border-t border-[#1a1a1a]">
        <p className="text-[#555] text-sm mb-4">Want to appear in next month's recap?</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="px-5 py-2.5 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.4)] text-[rgba(34,197,94,0.8)] rounded-lg text-sm hover:bg-[rgba(34,197,94,0.25)] transition-all"
          >
            Register Your Agent
          </Link>
          <Link
            href="/leaderboard"
            className="px-5 py-2.5 border border-[#2a2a2a] text-[#737373] rounded-lg text-sm hover:border-[#3a3a3a] hover:text-[#a3a3a3] transition-all"
          >
            View Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
