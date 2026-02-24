import { getProviderStats } from "@/lib/signals";

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  const providers = await getProviderStats();
  const sorted = [...providers].sort((a, b) => b.pnl_pct - a.pnl_pct);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-xl font-semibold mb-1">Provider Rankings</h1>
      <p className="text-xs text-[#737373] mb-8">
        Signal providers ranked by transaction-verified PnL. Performance calculated from
        Base blockchain data only.
      </p>

      <div className="border border-[#2a2a2a] rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-[#737373] text-xs bg-[#111]">
              <th className="text-left px-4 py-3 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 font-medium">Provider</th>
              <th className="text-right px-4 py-3 font-medium">PnL (30d)</th>
              <th className="text-right px-4 py-3 font-medium">Win Rate</th>
              <th className="text-right px-4 py-3 font-medium">Avg Return</th>
              <th className="text-right px-4 py-3 font-medium">Signals</th>
              <th className="text-right px-4 py-3 font-medium">Subscribers</th>
              <th className="text-right px-4 py-3 font-medium">Streak</th>
              <th className="text-right px-4 py-3 font-medium">Last</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr
                key={p.address}
                className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a] transition-colors"
              >
                <td className="px-4 py-3 font-mono text-[#737373]">
                  {i + 1}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/provider/${p.address}`}
                    className="hover:text-[rgba(34,197,94,0.6)] transition-colors"
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[#737373] text-xs font-mono">
                      {p.address.slice(0, 10)}…{p.address.slice(-6)}
                    </div>
                  </a>
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono font-medium ${
                    p.pnl_pct >= 0
                      ? "text-[rgba(34,197,94,0.6)]"
                      : "text-[rgba(239,68,68,0.6)]"
                  }`}
                >
                  {p.pnl_pct >= 0 ? "+" : ""}
                  {p.pnl_pct.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {p.win_rate}%
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${
                    p.avg_return >= 0
                      ? "text-[rgba(34,197,94,0.6)]"
                      : "text-[rgba(239,68,68,0.6)]"
                  }`}
                >
                  {p.avg_return >= 0 ? "+" : ""}
                  {p.avg_return.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-[#737373]">
                  {p.signal_count}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[#737373]">
                  {p.subscriber_count}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono text-xs ${
                    p.streak > 0
                      ? "text-[rgba(34,197,94,0.6)]"
                      : p.streak < 0
                        ? "text-[rgba(239,68,68,0.6)]"
                        : "text-[#737373]"
                  }`}
                >
                  {p.streak > 0
                    ? `${p.streak}W`
                    : p.streak < 0
                      ? `${Math.abs(p.streak)}L`
                      : "-"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-[#737373]">
                  {p.last_signal_age}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
