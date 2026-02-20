import { getProviderStats } from "@/lib/signals";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const providers = await getProviderStats();
  const p = providers.find(pr => pr.address.toLowerCase() === address.toLowerCase());
  if (!p) return notFound();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">{p.name}</h1>
        <div className="text-xs font-mono text-[#737373] mt-1">
          <a href={`https://basescan.org/address/${p.address}`} target="_blank" rel="noopener" className="hover:text-[#e5e5e5]">
            {p.address}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-10">
        {[
          { label: "PnL (30d)", value: `${p.pnl_pct >= 0 ? "+" : ""}${p.pnl_pct.toFixed(1)}%`, color: p.pnl_pct >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]" },
          { label: "Win Rate", value: `${p.win_rate}%`, color: "text-[#e5e5e5]" },
          { label: "Signals", value: String(p.signal_count), color: "text-[#e5e5e5]" },
          { label: "Subscribers", value: String(p.subscriber_count), color: "text-[#e5e5e5]" },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <div className={`font-mono text-xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#737373] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#737373] uppercase tracking-wider">Recent Trades</h2>
        <div className="text-xs text-[#737373]">
          Streak: <span className={p.streak > 0 ? "text-[rgba(34,197,94,0.6)]" : p.streak < 0 ? "text-[rgba(239,68,68,0.6)]" : ""}>{p.streak > 0 ? `${p.streak}W` : p.streak < 0 ? `${Math.abs(p.streak)}L` : "-"}</span>
          {" · "}Avg return: <span className="font-mono">{p.avg_return >= 0 ? "+" : ""}{p.avg_return.toFixed(1)}%</span>
        </div>
      </div>

      {p.trades.length === 0 ? (
        <div className="border border-[#2a2a2a] rounded-lg p-8 text-center text-[#737373] text-sm">
          No trade history available yet.
        </div>
      ) : (
        <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[#737373] text-xs bg-[#111]">
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Token</th>
                <th className="text-right px-4 py-3 font-medium">Entry</th>
                <th className="text-right px-4 py-3 font-medium">Leverage</th>
                <th className="text-right px-4 py-3 font-medium">PnL</th>
                <th className="text-right px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">TX</th>
              </tr>
            </thead>
            <tbody>
              {p.trades.map((t, i) => {
                const isBuy = t.action === "BUY" || t.action === "LONG";
                return (
                  <tr key={i} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a]">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isBuy ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]" : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"}`}>
                        {t.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{t.token}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {t.entryPrice ? `$${t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#737373]">
                      {t.leverage ? `${t.leverage}x` : "-"}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${!t.pnl ? "text-[#737373]" : t.pnl >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}`}>
                      {t.pnl !== undefined ? `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#737373]">
                      {t.status.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#737373]">
                      {t.txHash ? (
                        <a href={`https://basescan.org/tx/${t.txHash}`} target="_blank" rel="noopener" className="hover:text-[#e5e5e5]">
                          {t.txHash.slice(0, 10)}...
                        </a>
                      ) : "-"}
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
        <code className="text-xs font-mono text-[rgba(34,197,94,0.6)]">
          scripts/subscribe.sh {p.address}
        </code>
      </div>
    </main>
  );
}
