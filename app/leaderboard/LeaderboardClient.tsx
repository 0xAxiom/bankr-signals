"use client";

import { useState, useEffect } from "react";
import { ProviderStats } from "@/lib/signals";

type TimePeriod = "all" | "30d" | "7d" | "1d";

const PERIOD_LABELS = {
  all: "All Time",
  "30d": "Last 30 Days",
  "7d": "Last 7 Days", 
  "1d": "Last 24 Hours",
};

export default function LeaderboardClient({
  initialData,
}: {
  initialData: ProviderStats[];
}) {
  const [providers, setProviders] = useState<ProviderStats[]>(initialData);
  const [period, setPeriod] = useState<TimePeriod>("all");
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async (newPeriod: TimePeriod) => {
    if (newPeriod === "all") {
      // Use initial data for "all" to avoid unnecessary API call
      setProviders(initialData);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/leaderboard?period=${newPeriod}`);
      const data = await response.json();
      if (data.providers) {
        setProviders(data.providers);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    fetchLeaderboard(newPeriod);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1">Provider Rankings</h1>
        <p className="text-xs text-[#737373] mb-6">
          Signal providers ranked by transaction-verified PnL. Performance calculated from
          Base blockchain data only.
        </p>

        {/* Time Period Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              disabled={loading}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                period === p
                  ? "bg-[rgba(34,197,94,0.15)] text-[rgba(34,197,94,0.9)] border border-[rgba(34,197,94,0.3)]"
                  : "bg-[#1a1a1a] text-[#737373] border border-[#2a2a2a] hover:bg-[#2a2a2a] hover:text-[#999]"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[rgba(34,197,94,0.6)]"></div>
          <p className="text-sm text-[#737373] mt-2">Loading leaderboard...</p>
        </div>
      )}

      <div className={`border border-[#2a2a2a] rounded-lg overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-[#737373] text-xs bg-[#111]">
              <th className="text-left px-4 py-3 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 font-medium">Provider</th>
              <th className="text-right px-4 py-3 font-medium">
                PnL ({PERIOD_LABELS[period]})
              </th>
              <th className="text-right px-4 py-3 font-medium">Win Rate</th>
              <th className="text-right px-4 py-3 font-medium">Avg Return</th>
              <th className="text-right px-4 py-3 font-medium">Signals</th>
              <th className="text-right px-4 py-3 font-medium">Subscribers</th>
              <th className="text-right px-4 py-3 font-medium">Streak</th>
              <th className="text-right px-4 py-3 font-medium">Last</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => (
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

      {providers.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-[#737373] mb-2">No providers found for this time period</p>
          <p className="text-sm text-[#555]">Try selecting a different time range</p>
        </div>
      )}
    </main>
  );
}