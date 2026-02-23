import { supabase } from "./db";

export interface ParsedTrade {
  timestamp: string;
  action: "BUY" | "SELL" | "LONG" | "SHORT";
  token: string;
  entryPrice: number;
  leverage?: number;
  txHash?: string;
  exitTxHash?: string;
  pnl?: number;
  status: "open" | "closed" | "stopped";
  collateralUsd?: number;
  exitPrice?: number;
  exitTimestamp?: string;
}

export interface ProviderStats {
  address: string;
  name: string;
  avatar: string | null;
  pnl_pct: number;
  win_rate: number;
  signal_count: number;
  subscriber_count: number;
  avg_return: number;
  streak: number;
  last_signal_age: string;
  trades: ParsedTrade[];
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function getProviderStats(): Promise<ProviderStats[]> {
  // Fetch providers from DB
  const { data: providers, error: pErr } = await supabase
    .from("signal_providers")
    .select("*")
    .order("registered_at", { ascending: true });

  if (pErr) {
    console.error("Failed to fetch providers:", pErr.message);
    return [];
  }
  if (!providers || providers.length === 0) return [];

  // Fetch all signals from DB
  const { data: signals, error: sErr } = await supabase
    .from("signals")
    .select("*")
    .order("timestamp", { ascending: true });

  if (sErr) {
    console.error("Failed to fetch signals:", sErr.message);
  }
  const allSignals = signals || [];

  const results: ProviderStats[] = [];

  for (const provider of providers) {
    const providerSignals = allSignals.filter(
      (s) => s.provider.toLowerCase() === provider.address.toLowerCase()
    );

    const trades: ParsedTrade[] = providerSignals.map((s) => ({
      timestamp: s.timestamp,
      action: s.action as ParsedTrade["action"],
      token: s.token,
      entryPrice: s.entry_price,
      leverage: s.leverage,
      txHash: s.tx_hash,
      exitTxHash: s.exit_tx_hash,
      pnl: s.pnl_pct,
      status: s.status as ParsedTrade["status"],
      collateralUsd: s.collateral_usd,
      exitPrice: s.exit_price,
      exitTimestamp: s.exit_timestamp,
    }));

    const closed = trades.filter((t) => t.status === "closed" && t.pnl !== undefined);
    const wins = closed.filter((t) => (t.pnl || 0) > 0).length;
    const losses = closed.filter((t) => (t.pnl || 0) < 0).length;
    const totalClosed = wins + losses;
    const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;

    // Calculate weighted PnL
    let totalWeightedPnl = 0;
    let totalWeight = 0;
    for (const t of closed) {
      const weight = t.collateralUsd || 1;
      totalWeightedPnl += (t.pnl || 0) * weight;
      totalWeight += weight;
    }
    const pnlPct = totalWeight > 0 ? totalWeightedPnl / totalWeight : 0;

    // Streak
    let streak = 0;
    for (let i = closed.length - 1; i >= 0; i--) {
      const p = closed[i].pnl || 0;
      if (i === closed.length - 1) {
        streak = p > 0 ? 1 : p < 0 ? -1 : 0;
      } else {
        if (p > 0 && streak > 0) streak++;
        else if (p < 0 && streak < 0) streak--;
        else break;
      }
    }

    const lastTrade = trades[trades.length - 1];

    results.push({
      address: provider.address,
      name: provider.name,
      avatar: provider.avatar || null,
      pnl_pct: Math.round(pnlPct * 10) / 10,
      win_rate: Math.round(winRate),
      signal_count: trades.length,
      subscriber_count: 0,
      avg_return:
        totalClosed > 0
          ? Math.round((totalWeightedPnl / totalWeight) * 10) / 10
          : 0,
      streak,
      last_signal_age: lastTrade ? timeAgo(lastTrade.timestamp) : "never",
      trades,
    });
  }

  return results;
}
