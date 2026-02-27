/**
 * Signal of the Day — simply the highest PnL% signal from today.
 * If no closed signals today, falls back to highest unrealized PnL open signal.
 */

import { supabase } from "./db";
import { getTokenPrice, calculateUnrealizedPnl } from "./prices";

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
 * Select signal of the day: best signal from recent time periods.
 * Priority: closed signals with realized PnL > open signals with live PnL.
 * Falls back from 24h -> 3d -> 7d if no signals found.
 */
export async function selectSignalOfTheDay(): Promise<SignalOfDayResult | null> {
  try {
    // Try different time windows
    const timeWindows = [
      { hours: 24, label: "today" },
      { hours: 72, label: "this week" }, 
      { hours: 168, label: "recently" }, // 7 days
    ];

    for (const window of timeWindows) {
      const result = await findBestSignalInWindow(window.hours, window.label);
      if (result) return result;
    }

    return null;
  } catch (error) {
    console.error("Error selecting signal of the day:", error);
    return null;
  }
}

async function findBestSignalInWindow(hours: number, timeLabel: string): Promise<SignalOfDayResult | null> {
  const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // First: try closed signals with meaningful realized PnL 
  const { data: closedSignals } = await supabase
    .from("signals")
    .select("*, signal_providers!inner (name, avatar, address)")
    .eq("status", "closed")
    .not("pnl_pct", "is", null)
    .gte("timestamp", windowStart)
    .order("pnl_pct", { ascending: false })
    .limit(20);

  // Filter for meaningful PnL (>= 0.5% absolute)
  const meaningfulClosed = closedSignals?.filter(s => Math.abs(s.pnl_pct) >= 0.5);
  if (meaningfulClosed && meaningfulClosed.length > 0) {
    const signal = meaningfulClosed[0];
    const pnlText = signal.pnl_pct > 0 ? '+' : '';
    return formatResult(signal, `Top performer ${timeLabel}: ${pnlText}${signal.pnl_pct.toFixed(1)}% realized PnL`);
  }

  // Fallback: open signals with high conviction
  const { data: openSignals } = await supabase
    .from("signals") 
    .select("*, signal_providers!inner (name, avatar, address)")
    .eq("status", "open")
    .not("entry_price", "is", null)
    .gte("timestamp", windowStart)
    .order("confidence", { ascending: false, nullsFirst: false })
    .limit(20);

  if (!openSignals || openSignals.length === 0) return null;

  // Score open signals by confidence + provider track record
  let bestSignal = null;
  let bestScore = -Infinity;

  for (const signal of openSignals) {
    const confidence = Number(signal.confidence) || 0.5;
    const leverage = Number(signal.leverage) || 1;
    const collateral = Number(signal.collateral_usd) || 0;
    
    // Score: confidence (0-1) + leverage bonus + size bonus
    let score = confidence * 100;
    if (leverage > 1) score += Math.log(leverage) * 10; // Leverage adds risk/reward
    if (collateral >= 100) score += Math.log(collateral / 100) * 5; // Size shows conviction
    
    if (score > bestScore) {
      bestScore = score;
      bestSignal = signal;
    }
  }

  if (bestSignal) {
    const confidence = Number(bestSignal.confidence) || 0.5;
    const confidencePct = Math.round(confidence * 100);
    return formatResult(bestSignal, `High conviction signal ${timeLabel}: ${confidencePct}% confidence, ${bestSignal.action} ${bestSignal.token}`);
  }

  // Final fallback: most recent signal with reasoning
  const { data: latestSignals } = await supabase
    .from("signals")
    .select("*, signal_providers!inner (name, avatar, address)")
    .gte("timestamp", windowStart)
    .not("reasoning", "is", null)
    .order("timestamp", { ascending: false })
    .limit(1);

  if (latestSignals && latestSignals.length > 0) {
    return formatResult(latestSignals[0], `Latest signal ${timeLabel} with analysis`);
  }

  return null;
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
