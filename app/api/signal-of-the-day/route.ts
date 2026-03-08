import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, APIErrorCode } from "@/lib/api-utils";
import { SignalStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SignalMetrics {
  id: string;
  score: number;
  reason: string;
  signal: any;
}

function calculateSignalScore(signal: any): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  
  // High confidence signals get bonus points
  if (signal.confidence && signal.confidence >= 0.8) {
    score += 30;
    reasons.push(`high confidence (${(signal.confidence * 100).toFixed(0)}%)`);
  }
  
  // Completed trades with good PnL
  if (signal.status === 'closed' && signal.pnl_pct) {
    if (signal.pnl_pct > 5) {
      score += 50;
      reasons.push(`excellent return (+${signal.pnl_pct.toFixed(1)}%)`);
    } else if (signal.pnl_pct > 2) {
      score += 30;
      reasons.push(`good return (+${signal.pnl_pct.toFixed(1)}%)`);
    } else if (signal.pnl_pct > 0) {
      score += 10;
      reasons.push(`profitable (+${signal.pnl_pct.toFixed(1)}%)`);
    }
  }
  
  // High leverage positions (more exciting)
  if (signal.leverage && signal.leverage >= 10) {
    score += 20;
    reasons.push(`high leverage (${signal.leverage}x)`);
  } else if (signal.leverage && signal.leverage >= 5) {
    score += 10;
    reasons.push(`leveraged (${signal.leverage}x)`);
  }
  
  // Large collateral amount
  if (signal.collateral_usd && signal.collateral_usd >= 1000) {
    score += 25;
    reasons.push(`large position ($${signal.collateral_usd.toLocaleString()})`);
  } else if (signal.collateral_usd && signal.collateral_usd >= 500) {
    score += 15;
    reasons.push(`significant position ($${signal.collateral_usd.toFixed(0)})`);
  }
  
  // Detailed reasoning/strategy explanation
  if (signal.reasoning && signal.reasoning.length > 50) {
    score += 15;
    reasons.push("detailed strategy");
  }
  
  // SHORT positions are less common, might be interesting
  if (signal.action === 'SHORT') {
    score += 20;
    reasons.push("bearish position");
  }
  
  // Stop loss and take profit defined (good risk management)
  if (signal.stop_loss_pct && signal.take_profit_pct) {
    score += 15;
    reasons.push("risk management defined");
  }
  
  // Recent signals get slight preference
  const signalAge = Date.now() - new Date(signal.timestamp).getTime();
  const hoursOld = signalAge / (1000 * 60 * 60);
  if (hoursOld <= 24) {
    score += 10;
    reasons.push("recent signal");
  } else if (hoursOld <= 72) {
    score += 5;
  }
  
  // Bitcoin and Ethereum get slight preference (more recognized)
  if (['BTC', 'ETH'].includes(signal.token)) {
    score += 5;
    reasons.push(`major asset (${signal.token})`);
  }
  
  return {
    score,
    reason: reasons.join(", ")
  };
}

// GET /api/signal-of-the-day - Get the most interesting signal from recent activity
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const category = searchParams.get("category"); // 'profitable', 'high-confidence', 'large', 'recent'
    
    // Get signals from the last 7 days to ensure good selection
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    let query = supabase
      .from("signals")
      .select("*, providers(name, twitter, farcaster)")
      .gte("timestamp", weekAgo.toISOString())
      .order("timestamp", { ascending: false })
      .limit(100); // Get enough to have good options
    
    // Category filters
    if (category === 'profitable') {
      query = query.eq("status", "closed").gt("pnl_pct", 0);
    } else if (category === 'high-confidence') {
      query = query.gte("confidence", 0.8);
    } else if (category === 'large') {
      query = query.gte("collateral_usd", 500);
    } else if (category === 'recent') {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      query = query.gte("timestamp", dayAgo.toISOString());
    }
    
    const { data: signals, error } = await query;
    
    if (error) {
      console.error("Signal of day query error:", error);
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Database query failed",
        500
      );
    }
    
    if (!signals || signals.length === 0) {
      return createErrorResponse(
        APIErrorCode.NOT_FOUND,
        "No signals found for the specified criteria",
        404
      );
    }
    
    // Score all signals and pick the best ones
    const scoredSignals: SignalMetrics[] = signals.map(signal => {
      const { score, reason } = calculateSignalScore(signal);
      return {
        id: signal.id,
        score,
        reason,
        signal
      };
    });
    
    // Sort by score and get top candidates
    scoredSignals.sort((a, b) => b.score - a.score);
    
    const topSignal = scoredSignals[0];
    const alternativeSignals = scoredSignals.slice(1, 6); // Next 5 alternatives
    
    // Format the response with rich metadata for content generation
    const signalOfTheDay = {
      signal: {
        id: topSignal.signal.id,
        provider: topSignal.signal.provider,
        providerInfo: topSignal.signal.providers,
        timestamp: topSignal.signal.timestamp,
        action: topSignal.signal.action,
        token: topSignal.signal.token,
        chain: topSignal.signal.chain,
        entryPrice: topSignal.signal.entry_price,
        exitPrice: topSignal.signal.exit_price,
        leverage: topSignal.signal.leverage,
        confidence: topSignal.signal.confidence,
        reasoning: topSignal.signal.reasoning,
        collateralUsd: topSignal.signal.collateral_usd,
        status: topSignal.signal.status,
        pnlPct: topSignal.signal.pnl_pct,
        pnlUsd: topSignal.signal.pnl_usd,
        stopLossPct: topSignal.signal.stop_loss_pct,
        takeProfitPct: topSignal.signal.take_profit_pct,
        txHash: topSignal.signal.tx_hash,
      },
      metrics: {
        score: topSignal.score,
        reason: topSignal.reason,
        rank: 1,
        totalCandidates: scoredSignals.length
      },
      contentSuggestions: {
        headline: generateHeadline(topSignal.signal),
        tweetText: generateTweetText(topSignal.signal),
        summary: generateSummary(topSignal.signal),
      },
      alternatives: alternativeSignals.map((item, index) => ({
        signal: {
          id: item.signal.id,
          action: item.signal.action,
          token: item.signal.token,
          entryPrice: item.signal.entry_price,
          pnlPct: item.signal.pnl_pct,
          confidence: item.signal.confidence,
        },
        score: item.score,
        reason: item.reason,
        rank: index + 2
      }))
    };
    
    return createSuccessResponse(signalOfTheDay, 200, {
      timestamp: new Date().toISOString(),
      date,
      category: category || "all"
    });
    
  } catch (error: any) {
    console.error("Signal of day error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Internal server error",
      500
    );
  }
}

function generateHeadline(signal: any): string {
  const token = signal.token;
  const action = signal.action.toLowerCase();
  const provider = signal.providers?.name || `${signal.provider.slice(0, 8)}...`;
  
  if (signal.status === 'closed' && signal.pnl_pct) {
    const profit = signal.pnl_pct > 0 ? 'profit' : 'loss';
    return `${provider} ${action}s ${token} for ${Math.abs(signal.pnl_pct).toFixed(1)}% ${profit}`;
  } else if (signal.confidence && signal.confidence >= 0.8) {
    return `High-confidence ${token} ${action} signal from ${provider}`;
  } else if (signal.leverage && signal.leverage >= 10) {
    return `${signal.leverage}x leveraged ${token} ${action} by ${provider}`;
  } else {
    return `${provider} signals ${token} ${action} position`;
  }
}

function generateTweetText(signal: any): string {
  const token = signal.token;
  const action = signal.action;
  const price = signal.entry_price ? `$${signal.entry_price.toLocaleString()}` : "";
  const leverage = signal.leverage ? `${signal.leverage}x` : "";
  
  let tweet = `🎯 Signal of the Day: ${action} ${token}`;
  if (price) tweet += ` at ${price}`;
  if (leverage) tweet += ` (${leverage} leverage)`;
  
  if (signal.status === 'closed' && signal.pnl_pct) {
    const emoji = signal.pnl_pct > 0 ? "📈" : "📉";
    tweet += `\n\n${emoji} Result: ${signal.pnl_pct > 0 ? '+' : ''}${signal.pnl_pct.toFixed(1)}%`;
    if (signal.pnl_usd) {
      tweet += ` (${signal.pnl_usd > 0 ? '+' : ''}$${signal.pnl_usd.toFixed(2)})`;
    }
  } else if (signal.confidence) {
    tweet += `\n\n🎯 Confidence: ${(signal.confidence * 100).toFixed(0)}%`;
  }
  
  if (signal.reasoning && signal.reasoning.length <= 100) {
    tweet += `\n\n💡 "${signal.reasoning}"`;
  }
  
  tweet += `\n\nSee more signals: bankrsignals.com`;
  
  return tweet.length <= 280 ? tweet : tweet.substring(0, 277) + "...";
}

function generateSummary(signal: any): string {
  const token = signal.token;
  const action = signal.action.toLowerCase();
  const provider = signal.providers?.name || "an experienced trader";
  const time = new Date(signal.timestamp).toLocaleDateString();
  
  let summary = `On ${time}, ${provider} published a ${action} signal for ${token}`;
  
  if (signal.entry_price) {
    summary += ` at $${signal.entry_price.toLocaleString()}`;
  }
  
  if (signal.leverage) {
    summary += ` with ${signal.leverage}x leverage`;
  }
  
  if (signal.collateral_usd) {
    summary += ` and $${signal.collateral_usd.toFixed(0)} in collateral`;
  }
  
  if (signal.confidence) {
    summary += `. The signal had a confidence rating of ${(signal.confidence * 100).toFixed(0)}%`;
  }
  
  if (signal.status === 'closed' && signal.pnl_pct) {
    const outcome = signal.pnl_pct > 0 ? 'profitable' : 'resulted in a loss';
    summary += ` and was ${outcome}, closing with a ${signal.pnl_pct > 0 ? '+' : ''}${signal.pnl_pct.toFixed(1)}% return`;
  } else if (signal.status === 'open') {
    summary += ` and remains open`;
  }
  
  if (signal.reasoning) {
    summary += `. The trader's reasoning: "${signal.reasoning}"`;
  }
  
  return summary + ".";
}