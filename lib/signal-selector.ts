/**
 * Enhanced signal-of-the-day selection algorithm
 * Considers multiple factors for better signal curation
 */

import { supabase } from "./db";
import { getTokenPrice } from "./prices";
import { SignalAction, SignalCategory, RiskLevel } from "./types";

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
 * Select the best signal of the day using multi-factor scoring
 */
export async function selectSignalOfTheDay(): Promise<SignalOfDayResult | null> {
  try {
    // Get signals from the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: signals, error } = await supabase
      .from("signals")
      .select(`
        *,
        signal_providers!inner (
          name, avatar, verified, reputation, total_signals, win_rate, avg_roi
        )
      `)
      .gte("timestamp", weekAgo)
      .order("timestamp", { ascending: false })
      .limit(100);

    if (error || !signals || signals.length === 0) {
      return null;
    }

    // Score all signals
    const scoredSignals = await Promise.all(
      signals.map(signal => scoreSignal(signal))
    );

    // Apply diversification bonus (prefer different tokens/providers)
    const diversifiedScores = applyDiversificationBonus(scoredSignals);

    // Sort by final score
    diversifiedScores.sort((a, b) => b.score - a.score);
    
    const bestSignal = diversifiedScores[0];
    const signalData = signals.find(s => s.id === bestSignal.signalId);
    
    if (!signalData) return null;

    // Generate reasoning
    const reasoning = generateSignalReasoning(bestSignal, signalData);

    return {
      signal: signalData,
      provider: signalData.signal_providers,
      score: bestSignal,
      reasoning,
    };

  } catch (error) {
    console.error("Error selecting signal of the day:", error);
    return null;
  }
}

/**
 * Score an individual signal based on multiple factors
 */
async function scoreSignal(signal: any): Promise<SignalScore> {
  const now = Date.now();
  const signalTime = new Date(signal.timestamp).getTime();
  const hoursAgo = (now - signalTime) / (1000 * 60 * 60);
  const provider = signal.signal_providers;

  // 1. Recency Score (0-25 points)
  const recencyScore = calculateRecencyScore(hoursAgo);

  // 2. Performance Score (0-30 points)  
  const performanceScore = calculatePerformanceScore(signal);

  // 3. Provider Reputation Score (0-20 points)
  const reputationScore = calculateProviderScore(provider);

  // 4. Risk-Adjusted Score (0-15 points)
  const riskAdjustedScore = calculateRiskScore(signal);

  // 5. Technical Strength Score (0-10 points)
  const technicalScore = calculateTechnicalScore(signal);

  // 6. Engagement Score (0-5 points) - placeholder for future metrics
  const engagementScore = 0; // TODO: Implement based on views/follows/copies

  const breakdown = {
    recency: recencyScore,
    performance: performanceScore,
    providerReputation: reputationScore,
    riskAdjusted: riskAdjustedScore,
    technicalStrength: technicalScore,
    diversification: 0, // Applied later
    engagement: engagementScore,
  };

  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  return {
    signalId: signal.id,
    score: totalScore,
    breakdown,
  };
}

/**
 * Calculate recency score - newer signals get higher scores
 */
function calculateRecencyScore(hoursAgo: number): number {
  if (hoursAgo < 2) return 25; // Very recent
  if (hoursAgo < 6) return 22;
  if (hoursAgo < 12) return 18;
  if (hoursAgo < 24) return 15;
  if (hoursAgo < 48) return 10;
  if (hoursAgo < 72) return 5;
  return 0; // Too old
}

/**
 * Calculate performance score based on signal outcomes
 */
function calculatePerformanceScore(signal: any): number {
  let score = 15; // Base score

  // Closed signals with PnL
  if (signal.status === "closed" && signal.pnl_pct !== null) {
    const pnl = signal.pnl_pct;
    if (pnl > 20) score += 15; // Exceptional gain
    else if (pnl > 10) score += 12;
    else if (pnl > 5) score += 8;
    else if (pnl > 0) score += 5;
    else if (pnl > -5) score += 2; // Small loss
    else if (pnl > -10) score -= 3; // Medium loss
    else score -= 8; // Large loss

    // Bonus for good risk-reward execution
    if (signal.risk_reward_ratio && signal.risk_reward_ratio >= 2 && pnl > 0) {
      score += 5;
    }
  }

  // Open signals - estimate current performance
  if (signal.status === "open" && signal.unrealized_pnl_pct !== null) {
    const unrealizedPnl = signal.unrealized_pnl_pct;
    if (unrealizedPnl > 10) score += 10;
    else if (unrealizedPnl > 5) score += 7;
    else if (unrealizedPnl > 0) score += 4;
    else if (unrealizedPnl > -5) score += 1;
    else score -= 2; // Currently losing
  }

  // Confidence bonus
  if (signal.confidence && signal.confidence >= 0.8) score += 3;
  else if (signal.confidence && signal.confidence >= 0.6) score += 1;

  return Math.max(0, Math.min(30, score));
}

/**
 * Calculate provider reputation score
 */
function calculateProviderScore(provider: any): number {
  let score = 5; // Base score

  // Verification status
  if (provider.verified) score += 5;

  // Win rate
  const winRate = provider.win_rate || 0;
  if (winRate >= 80) score += 8;
  else if (winRate >= 70) score += 6;
  else if (winRate >= 60) score += 4;
  else if (winRate >= 50) score += 2;
  else score -= 1; // Below 50% win rate penalty

  // Track record (total signals)
  const totalSignals = provider.total_signals || 0;
  if (totalSignals >= 100) score += 3;
  else if (totalSignals >= 50) score += 2;
  else if (totalSignals >= 20) score += 1;
  else if (totalSignals < 5) score -= 2; // Too new/inexperienced

  // Average ROI
  const avgRoi = provider.avg_roi || 0;
  if (avgRoi >= 15) score += 4;
  else if (avgRoi >= 10) score += 3;
  else if (avgRoi >= 5) score += 1;
  else if (avgRoi < 0) score -= 2; // Negative average ROI

  return Math.max(0, Math.min(20, score));
}

/**
 * Calculate risk-adjusted score
 */
function calculateRiskScore(signal: any): number {
  let score = 8; // Base score

  // Risk level consideration
  switch (signal.risk_level) {
    case RiskLevel.LOW:
      score += 7; // Prefer lower risk
      break;
    case RiskLevel.MEDIUM:
      score += 5;
      break;
    case RiskLevel.HIGH:
      score += 2;
      break;
    case RiskLevel.EXTREME:
      score -= 3; // Penalty for extreme risk
      break;
  }

  // Leverage penalty for high leverage
  const leverage = signal.leverage || 1;
  if (leverage > 10) score -= 5;
  else if (leverage > 5) score -= 2;
  else if (leverage <= 2) score += 2; // Bonus for conservative leverage

  // Position size consideration
  const positionSize = signal.position_size || 0;
  if (positionSize > 0) {
    if (positionSize <= 5) score += 3; // Conservative position sizing
    else if (positionSize <= 10) score += 1;
    else if (positionSize > 25) score -= 3; // Over-concentrated
  }

  // Stop loss protection bonus
  if (signal.stop_loss_pct && signal.stop_loss_pct <= 10) score += 2;

  return Math.max(0, Math.min(15, score));
}

/**
 * Calculate technical analysis strength score
 */
function calculateTechnicalScore(signal: any): number {
  let score = 2; // Base score

  // Reasoning quality bonus
  if (signal.reasoning) {
    const reasoning = signal.reasoning.toLowerCase();
    const technicalTerms = [
      'support', 'resistance', 'breakout', 'reversal', 'trend',
      'fibonacci', 'rsi', 'macd', 'volume', 'pattern',
      'bollinger', 'moving average', 'momentum', 'divergence'
    ];
    
    const termCount = technicalTerms.filter(term => reasoning.includes(term)).length;
    score += Math.min(5, termCount); // Max 5 points for technical terms
  }

  // Time frame appropriateness
  if (signal.time_frame) {
    // Prefer medium-term signals for signal of the day
    if (signal.time_frame === "1d" || signal.time_frame === "4h") score += 3;
    else if (signal.time_frame === "1h" || signal.time_frame === "1w") score += 1;
  }

  // Risk-reward ratio bonus
  if (signal.risk_reward_ratio && signal.risk_reward_ratio >= 3) score += 3;
  else if (signal.risk_reward_ratio && signal.risk_reward_ratio >= 2) score += 2;

  return Math.max(0, Math.min(10, score));
}

/**
 * Apply diversification bonus to encourage variety in signal selection
 */
function applyDiversificationBonus(signals: SignalScore[]): SignalScore[] {
  // Get signal data for diversification analysis
  const signalData = new Map();
  
  return signals.map(signalScore => {
    // This would require fetching signal details, simplified for now
    // In a real implementation, track recent signal-of-day selections
    // and provide bonus for different tokens, providers, categories
    
    const diversificationBonus = Math.random() * 5; // Placeholder random bonus
    
    return {
      ...signalScore,
      score: signalScore.score + diversificationBonus,
      breakdown: {
        ...signalScore.breakdown,
        diversification: diversificationBonus,
      },
    };
  });
}

/**
 * Generate human-readable reasoning for why this signal was selected
 */
function generateSignalReasoning(score: SignalScore, signal: any): string {
  const reasons = [];
  
  if (score.breakdown.performance > 20) {
    if (signal.status === "closed" && signal.pnl_pct > 10) {
      reasons.push(`delivered ${signal.pnl_pct.toFixed(1)}% profit`);
    } else if (signal.unrealized_pnl_pct > 5) {
      reasons.push(`currently up ${signal.unrealized_pnl_pct.toFixed(1)}%`);
    }
  }
  
  if (score.breakdown.providerReputation > 15) {
    const provider = signal.signal_providers;
    if (provider.win_rate > 70) {
      reasons.push(`${provider.win_rate}% win rate provider`);
    }
    if (provider.verified) {
      reasons.push("verified provider");
    }
  }
  
  if (score.breakdown.recency > 20) {
    reasons.push("fresh signal");
  }
  
  if (score.breakdown.riskAdjusted > 12) {
    if (signal.risk_level === RiskLevel.LOW) {
      reasons.push("low risk profile");
    }
    if (signal.stop_loss_pct) {
      reasons.push(`${signal.stop_loss_pct}% stop loss protection`);
    }
  }
  
  if (signal.risk_reward_ratio >= 3) {
    reasons.push(`${signal.risk_reward_ratio}:1 risk-reward ratio`);
  }
  
  if (signal.reasoning && signal.reasoning.length > 50) {
    reasons.push("detailed technical analysis");
  }

  const reasonText = reasons.length > 0 
    ? `Selected for: ${reasons.join(", ")}`
    : "Selected based on overall signal quality and timing";

  return `${reasonText}. Score: ${score.score.toFixed(1)}/100`;
}

/**
 * Get trending signals by category for enhanced feed diversity
 */
export async function getTrendingSignalsByCategory(hours: number = 24): Promise<Record<string, any[]>> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data: signals, error } = await supabase
      .from("signals")
      .select("*, signal_providers!inner (name, avatar)")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false });

    if (error || !signals) return {};

    // Group by category
    const byCategory: Record<string, any[]> = {};
    
    for (const signal of signals) {
      const category = signal.category || "spot";
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(signal);
    }

    // Sort each category by a simple trending score
    for (const category in byCategory) {
      byCategory[category] = byCategory[category]
        .map(signal => ({
          ...signal,
          trendScore: calculateSimpleTrendScore(signal)
        }))
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, 5); // Top 5 per category
    }

    return byCategory;
  } catch (error) {
    console.error("Error getting trending signals:", error);
    return {};
  }
}

/**
 * Simple trend score for category-based trending
 */
function calculateSimpleTrendScore(signal: any): number {
  const hoursAgo = (Date.now() - new Date(signal.timestamp).getTime()) / (1000 * 60 * 60);
  const recency = Math.max(0, 24 - hoursAgo); // More recent = higher score
  
  const performance = signal.pnl_pct || signal.unrealized_pnl_pct || 0;
  const confidence = (signal.confidence || 0) * 10;
  
  return recency + performance + confidence;
}