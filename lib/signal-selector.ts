/**
 * Signal of the Day — simply the highest PnL% signal from today.
 * If no closed signals today, falls back to highest unrealized PnL open signal.
 */

import { supabase } from "./db";
import { getTokenPrice } from "./prices";

export interface SignalScore {
  signalId: string;
  score: number;
  breakdown: {
    recency: number;
    performance: number;
    providerReputation: number;
    riskAdjusted: number;
    technicalStrength: number;
    diversification: number;
    engagement: number;
  };
}

export interface SignalOfDayResult {
  signal: any;
  provider: any;
  score: SignalScore;
  reasoning: string;
}

/**
 * Select signal of the day: highest PnL% signal today.
 * Priority: closed signals with realized PnL > open signals with live PnL.
 */
export async function selectSignalOfTheDay(): Promise<SignalOfDayResult | null> {
  try {
    // Today = last 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // First: try closed signals with realized PnL from today
    const { data: closedSignals } = await supabase
      .from("signals")
      .select("*, signal_providers!inner (name, avatar, address)")
      .eq("status", "closed")
      .not("pnl_pct", "is", null)
      .gte("timestamp", dayAgo)
      .order("pnl_pct", { ascending: false })
      .limit(1);

    if (closedSignals && closedSignals.length > 0) {
      const signal = closedSignals[0];
      return formatResult(signal, `Top performer today: ${signal.pnl_pct > 0 ? '+' : ''}${signal.pnl_pct.toFixed(1)}% realized PnL`);
    }

    // Fallback: open signals — compute live PnL from current price vs entry
    const { data: openSignals } = await supabase
      .from("signals")
      .select("*, signal_providers!inner (name, avatar, address)")
      .eq("status", "open")
      .not("entry_price", "is", null)
      .gte("timestamp", dayAgo)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (!openSignals || openSignals.length === 0) {
      // Last resort: any signal from last 7 days with PnL
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentSignals } = await supabase
        .from("signals")
        .select("*, signal_providers!inner (name, avatar, address)")
        .not("pnl_pct", "is", null)
        .gte("timestamp", weekAgo)
        .order("pnl_pct", { ascending: false })
        .limit(1);

      if (recentSignals && recentSignals.length > 0) {
        const signal = recentSignals[0];
        return formatResult(signal, `Best recent signal: ${signal.pnl_pct > 0 ? '+' : ''}${signal.pnl_pct.toFixed(1)}% PnL`);
      }

      return null;
    }

    // Compute live PnL for open signals
    let bestSignal = null;
    let bestPnl = -Infinity;

    for (const signal of openSignals) {
      try {
        const tokenAddress = signal.token_address;
        if (!tokenAddress || !signal.entry_price) continue;

        const currentPrice = await getTokenPrice(tokenAddress) as number | null;
        if (!currentPrice) continue;

        const entry = Number(signal.entry_price);
        const isLong = ['LONG', 'BUY'].includes(signal.action);
        const leverage = Number(signal.leverage) || 1;
        const pnlPct = isLong
          ? ((currentPrice - entry) / entry) * 100 * leverage
          : ((entry - currentPrice) / entry) * 100 * leverage;

        if (pnlPct > bestPnl) {
          bestPnl = pnlPct;
          bestSignal = { ...signal, live_pnl_pct: pnlPct };
        }
      } catch {
        continue;
      }
    }

    if (bestSignal) {
      return formatResult(bestSignal, `Currently ${bestPnl > 0 ? '+' : ''}${bestPnl.toFixed(1)}% (live)`);
    }

    // Nothing with computable PnL — just pick most recent signal today
    const { data: latestSignals } = await supabase
      .from("signals")
      .select("*, signal_providers!inner (name, avatar, address)")
      .gte("timestamp", dayAgo)
      .order("timestamp", { ascending: false })
      .limit(1);

    if (latestSignals && latestSignals.length > 0) {
      return formatResult(latestSignals[0], "Most recent signal today");
    }

    return null;
  } catch (error) {
    console.error("Error selecting signal of the day:", error);
    return null;
  }
}

function formatResult(signal: any, reasoning: string): SignalOfDayResult {
  const pnl = signal.pnl_pct ?? signal.live_pnl_pct ?? 0;
  return {
    signal,
    provider: signal.signal_providers,
    score: {
      signalId: signal.id,
      score: pnl,
      breakdown: {
        recency: 0,
        performance: pnl,
        providerReputation: 0,
        riskAdjusted: 0,
        technicalStrength: 0,
        diversification: 0,
        engagement: 0,
      },
    },
    reasoning,
  };
}

/**
 * Get trending signals by category (kept for /api/signal-of-day?trending=true)
 */
export async function getTrendingSignalsByCategory(hours: number = 24): Promise<Record<string, any[]>> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: signals, error } = await supabase
      .from("signals")
      .select("*, signal_providers!inner (name, avatar, address)")
      .gte("timestamp", since)
      .order("pnl_pct", { ascending: false, nullsFirst: false });

    if (error || !signals) return {};

    const byCategory: Record<string, any[]> = {};
    for (const signal of signals) {
      const category = signal.category || "spot";
      if (!byCategory[category]) byCategory[category] = [];
      if (byCategory[category].length < 5) byCategory[category].push(signal);
    }

    return byCategory;
  } catch (error) {
    console.error("Error getting trending signals:", error);
    return {};
  }
}
