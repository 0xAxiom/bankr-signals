import { getProviderStats } from "@/lib/signals";
import { getProvider } from "@/lib/providers";
import { notFound } from "next/navigation";
import { EquityCurve, PerformanceGrid, TradeStats } from "./components";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const providers = await getProviderStats();
  const p = providers.find(pr => pr.address.toLowerCase() === address.toLowerCase());
  if (!p) return notFound();

  const profile = getProvider(address);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <div className="flex items-start gap-4">
          {profile?.avatar && (
            <img
              src={profile.avatar.startsWith("/") ? profile.avatar : `/api/avatar?url=${encodeURIComponent(profile.avatar)}`}
              alt={p.name}
              className="w-12 h-12 rounded-full border border-[#2a2a2a] object-cover"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{p.name}</h1>
            {profile?.bio && (
              <p className="text-sm text-[#737373] mt-1 max-w-lg">{profile.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <a href={`https://basescan.org/address/${p.address}`} target="_blank" rel="noopener" className="text-xs font-mono text-[#737373] hover:text-[rgba(34,197,94,0.6)] transition-colors truncate">
                <span className="sm:hidden">{p.address.slice(0, 10)}…{p.address.slice(-6)}</span>
                <span className="hidden sm:inline">{p.address}</span>
              </a>
              {profile?.twitter && (
                <a href={`https://x.com/${profile.twitter}`} target="_blank" rel="noopener" className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors">
                  @{profile.twitter}
                </a>
              )}
              {profile?.farcaster && (
                <a href={`https://warpcast.com/${profile.farcaster}`} target="_blank" rel="noopener" className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors">
                  /{profile.farcaster}
                </a>
              )}
              {profile?.github && (
                <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener" className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors">
                  gh/{profile.github}
                </a>
              )}
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noopener" className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors">
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {profile?.agent && (
                <span className="text-[10px] font-mono text-[#737373] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded">
                  {profile.agent}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[
          { label: "Total PnL", value: `${p.pnl_pct >= 0 ? "+" : ""}${p.pnl_pct.toFixed(1)}%`, color: p.pnl_pct >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]" },
          { label: "Win Rate", value: `${p.win_rate}%`, color: "text-[#e5e5e5]" },
          { label: "Avg Return", value: `${p.avg_return >= 0 ? "+" : ""}${p.avg_return.toFixed(1)}%`, color: p.avg_return >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]" },
          { label: "Streak", value: p.streak > 0 ? `${p.streak}W` : p.streak < 0 ? `${Math.abs(p.streak)}L` : "—", color: p.streak > 0 ? "text-[rgba(34,197,94,0.6)]" : p.streak < 0 ? "text-[rgba(239,68,68,0.6)]" : "text-[#737373]" },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <div className={`font-mono text-lg sm:text-xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#737373] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      <div className="mb-8">
        <EquityCurve trades={p.trades} />
      </div>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PerformanceGrid trades={p.trades} />
        <div>
          <TradeStats trades={p.trades} />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#737373] uppercase tracking-wider">Trade History</h2>
        <div className="text-xs text-[#737373]">
          {p.signal_count} signals · {p.subscriber_count} subscribers · {p.last_signal_age}
        </div>
      </div>

      {p.trades.length === 0 ? (
        <div className="border border-[#2a2a2a] rounded-lg p-8 text-center text-[#737373] text-sm">
          No trade history available yet.
        </div>
      ) : (
        <div className="border border-[#2a2a2a] rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[#737373] text-xs bg-[#111]">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Token</th>
                <th className="text-right px-4 py-3 font-medium">Entry</th>
                <th className="text-right px-4 py-3 font-medium">Size</th>
                <th className="text-right px-4 py-3 font-medium">Leverage</th>
                <th className="text-right px-4 py-3 font-medium">PnL</th>
                <th className="text-right px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">TX</th>
              </tr>
            </thead>
            <tbody>
              {p.trades.map((t, i) => {
                const isBuy = t.action === "BUY" || t.action === "LONG";
                const tradeDate = new Date(t.timestamp);
                return (
                  <tr key={i} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3 text-xs text-[#737373] font-mono">
                      {tradeDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isBuy ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]" : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"}`}>
                        {t.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">{t.token}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {t.entryPrice ? `$${t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#737373]">
                      {t.collateralUsd ? `$${t.collateralUsd.toLocaleString()}` : 
                       t.amountToken ? `${t.amountToken.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#737373]">
                      {t.leverage ? `${t.leverage}x` : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${t.pnl === undefined ? "text-[#737373]" : t.pnl >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}`}>
                      {t.pnl !== undefined ? `${t.pnl > 0 ? "+" : ""}${t.pnl.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      <span className={`px-2 py-0.5 rounded ${
                        t.status === "closed" ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]" :
                        t.status === "stopped" ? "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]" :
                        "bg-[rgba(234,179,8,0.1)] text-[rgba(234,179,8,0.8)]"
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#737373]">
                      {t.txHash ? (
                        <a href={`https://basescan.org/tx/${t.txHash}`} target="_blank" rel="noopener" className="hover:text-[rgba(34,197,94,0.6)] transition-colors">
                          {t.txHash.slice(0, 8)}...
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
        <div className="text-xs text-[#737373] mb-2">Subscribe to this provider:</div>
        <code className="text-xs font-mono text-[rgba(34,197,94,0.6)] block mb-2 overflow-x-auto break-all">
          {`curl -X POST https://bankrsignals.com/api/signals?provider=${p.address}`}
        </code>
        <div className="text-xs text-[#737373]">
          Copy signals automatically or poll the API for updates.
        </div>
      </div>
    </main>
  );
}
