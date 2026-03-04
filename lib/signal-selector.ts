/**
 * Signal of the Day — highlights the most impressive signal from other providers.
 * NEVER features our own signals (Axiom / 0x523Eff...) — that looks self-promotional.
 * Prioritizes OPEN signals with high live PnL (exciting to visitors) over closed ones.
 */

import { supabase } from "./db";

// Our wallet address — NEVER feature our own signals
const OUR_WALLET = "0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5";

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

function isOurSignal(signal: any): boolean {
  const addr = signal.signal_providers?.address || signal.provider_address || "";
  return addr.toLowerCase() === OUR_WALLET;
}

/**
 * Select signal of the day.
 * Priority: open signals with best live PnL > closed signals with best realized PnL.
 * Never picks our own signals.
 */
export async function selectSignalOfTheDay(): Promise<SignalOfDayResult | null> {
  try {
    const timeWindows = [
      { hours: 24, label: "today" },
      { hours: 72, label: "this week" },
      { hours: 168, label: "recently" },
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

  // FIRST: Open signals — these are live and exciting for visitors
  const { data: openSignals } = await supabase
    .from("signals")
    .select("*, signal_providers!inner (name, avatar, address)")
    .eq("status", "open")
    .not("entry_price", "is", null)
    .gte("timestamp", windowStart)
    .order("timestamp", { ascending: false })
    .limit(30);

  if (openSignals && openSignals.length > 0) {
    // Filter out our own signals
    const otherSignals = openSignals.filter(s => !isOurSignal(s));
    
    if (otherSignals.length > 0) {
      // Pick by highest confidence + leverage combo (we don't have live PnL in DB)
      let best = otherSignals[0];
      let bestScore = -Infinity;

      for (const signal of otherSignals) {
        const confidence = Number(signal.confidence) || 0.5;
        const leverage = Number(signal.leverage) || 1;
        const collateral = Number(signal.collateral_usd) || 0;
        
        let score = confidence * 100;
        if (leverage > 1) score += Math.log(leverage) * 10;
        if (collateral >= 100) score += Math.log(collateral / 100) * 5;
        
        if (score > bestScore) {
          bestScore = score;
          best = signal;
        }
      }

      const lev = best.leverage ? `${best.leverage}x ` : "";
      return formatResult(best, `Live ${timeLabel}: ${lev}${best.action} ${best.token} by ${best.signal_providers.name}`);
    }
  }

  // SECOND: Closed signals with realized PnL
  const { data: closedSignals } = await supabase
    .from("signals")
    .select("*, signal_providers!inner (name, avatar, address)")
    .eq("status", "closed")
    .not("pnl_pct", "is", null)
    .gte("timestamp", windowStart)
    .order("pnl_pct", { ascending: false })
    .limit(20);

  if (closedSignals && closedSignals.length > 0) {
    // Filter out our own + require meaningful PnL
    const others = closedSignals
      .filter(s => !isOurSignal(s))
      .filter(s => Math.abs(s.pnl_pct) >= 0.5);

    if (others.length > 0) {
      const signal = others[0];
      const pnlText = signal.pnl_pct > 0 ? "+" : "";
      return formatResult(signal, `Top performer ${timeLabel}: ${pnlText}${signal.pnl_pct.toFixed(1)}% by ${signal.signal_providers.name}`);
    }
  }

  // LAST RESORT: Any recent signal from another provider
  const { data: anySignals } = await supabase
    .from("signals")
    .select("*, signal_providers!inner (name, avatar, address)")
    .gte("timestamp", windowStart)
    .order("timestamp", { ascending: false })
    .limit(20);

  if (anySignals && anySignals.length > 0) {
    const others = anySignals.filter(s => !isOurSignal(s));
    if (others.length > 0) {
      return formatResult(others[0], `Latest signal ${timeLabel} by ${others[0].signal_providers.name}`);
    }
  }

  return null;
}

function formatResult(signal: any, reasoning: string): SignalOfDayResult {
  const pnl = signal.pnl_pct ?? 0;
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
 * Get trending signals by category
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
