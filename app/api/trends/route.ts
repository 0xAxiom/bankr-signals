import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse, APIErrorCode } from '@/lib/api-utils';
import { dbGetSignals, dbGetProviders } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TrendData {
  token_trends: {
    token: string;
    signal_count: number;
    avg_pnl: number;
    win_rate: number;
    last_signal: string;
    momentum: 'hot' | 'cooling' | 'stable';
  }[];
  sentiment_analysis: {
    period: string;
    bullish_signals: number;
    bearish_signals: number;
    neutral_signals: number;
    sentiment_score: number;
    sentiment_label: string;
  };
  provider_momentum: {
    provider: string;
    provider_name: string;
    recent_performance: number;
    streak: number;
    trend: 'rising' | 'falling' | 'stable';
  }[];
  market_insights: {
    insight: string;
    type: 'trend' | 'pattern' | 'alert' | 'opportunity';
    confidence: number;
  }[];
}

function calculateMomentum(signals: any[], period: string): 'hot' | 'cooling' | 'stable' {
  const now = Date.now();
  const periodMs = period === '24h' ? 24 * 60 * 60 * 1000 : 
                   period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                   30 * 24 * 60 * 60 * 1000;
  
  const halfPeriod = periodMs / 2;
  const recentSignals = signals.filter(s => 
    now - new Date(s.timestamp).getTime() < halfPeriod
  );
  const olderSignals = signals.filter(s => {
    const age = now - new Date(s.timestamp).getTime();
    return age >= halfPeriod && age < periodMs;
  });
  
  if (recentSignals.length > olderSignals.length * 1.5) return 'hot';
  if (recentSignals.length < olderSignals.length * 0.5) return 'cooling';
  return 'stable';
}

function calculateProviderTrend(signals: any[]): 'rising' | 'falling' | 'stable' {
  if (signals.length < 4) return 'stable';
  
  // Look at recent vs older performance
  const sortedSignals = signals.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  const recentSignals = sortedSignals.slice(0, Math.ceil(signals.length / 2));
  const olderSignals = sortedSignals.slice(Math.ceil(signals.length / 2));
  
  const recentAvg = recentSignals
    .filter(s => s.pnl_pct !== null)
    .reduce((sum, s) => sum + s.pnl_pct, 0) / 
    recentSignals.filter(s => s.pnl_pct !== null).length;
    
  const olderAvg = olderSignals
    .filter(s => s.pnl_pct !== null)
    .reduce((sum, s) => sum + s.pnl_pct, 0) / 
    olderSignals.filter(s => s.pnl_pct !== null).length;
  
  if (recentAvg > olderAvg + 2) return 'rising';
  if (recentAvg < olderAvg - 2) return 'falling';
  return 'stable';
}

function calculateWinStreak(signals: any[]): number {
  const sortedSignals = signals
    .filter(s => s.status === 'closed' && s.pnl_pct !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  let streak = 0;
  for (const signal of sortedSignals) {
    if (signal.pnl_pct > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function generateMarketInsights(
  tokenTrends: any[],
  sentimentData: any,
  providerMomentum: any[]
): { insight: string; type: 'trend' | 'pattern' | 'alert' | 'opportunity'; confidence: number; }[] {
  const insights = [];
  
  // Token trend insights
  const hotTokens = tokenTrends.filter(t => t.momentum === 'hot').length;
  if (hotTokens > 3) {
    insights.push({
      insight: `${hotTokens} tokens showing accelerating signal activity - increased market volatility expected`,
      type: 'trend' as const,
      confidence: 4
    });
  }
  
  // High performance opportunities
  const highPerformers = tokenTrends.filter(t => t.avg_pnl > 10 && t.win_rate > 70);
  if (highPerformers.length > 0) {
    insights.push({
      insight: `${highPerformers[0].token} showing ${highPerformers[0].avg_pnl.toFixed(1)}% avg PnL with ${highPerformers[0].win_rate}% win rate - worth monitoring`,
      type: 'opportunity' as const,
      confidence: 5
    });
  }
  
  // Sentiment shifts
  if (Math.abs(sentimentData.sentiment_score) > 0.6) {
    const direction = sentimentData.sentiment_score > 0 ? 'bullish' : 'bearish';
    insights.push({
      insight: `Strong ${direction} sentiment detected - ${sentimentData.sentiment_score > 0 ? sentimentData.bullish_signals : sentimentData.bearish_signals} ${direction} signals dominating`,
      type: 'pattern' as const,
      confidence: 4
    });
  }
  
  // Provider streaks
  const topStreaks = providerMomentum.filter(p => p.streak >= 3);
  if (topStreaks.length > 0) {
    insights.push({
      insight: `${topStreaks[0].provider_name} on ${topStreaks[0].streak}-signal winning streak - momentum strategy worth following`,
      type: 'opportunity' as const,
      confidence: 3
    });
  }
  
  // Rising performers
  const risingProviders = providerMomentum.filter(p => p.trend === 'rising').length;
  if (risingProviders >= 3) {
    insights.push({
      insight: `${risingProviders} providers showing improving performance - market conditions may be stabilizing`,
      type: 'pattern' as const,
      confidence: 3
    });
  }
  
  // Low activity alert
  if (tokenTrends.length < 5) {
    insights.push({
      insight: `Low signal diversity detected - consider expanding watchlist or increasing position sizes on proven performers`,
      type: 'alert' as const,
      confidence: 3
    });
  }
  
  // Market concentration
  const topTokenSignals = tokenTrends.slice(0, 3).reduce((sum, t) => sum + t.signal_count, 0);
  const totalSignals = tokenTrends.reduce((sum, t) => sum + t.signal_count, 0);
  if (totalSignals > 0 && topTokenSignals / totalSignals > 0.7) {
    const topTokens = tokenTrends.slice(0, 3).map(t => t.token).join(', ');
    insights.push({
      insight: `Signal activity concentrated in ${topTokens} - market focus narrowing, watch for breakouts`,
      type: 'pattern' as const,
      confidence: 4
    });
  }
  
  return insights.slice(0, 6); // Limit to 6 insights
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '7d';
    
    // Validate timeframe
    if (!['24h', '7d', '30d'].includes(timeframe)) {
      return createErrorResponse(
        APIErrorCode.BAD_REQUEST,
        'Invalid timeframe. Use 24h, 7d, or 30d',
        400
      );
    }
    
    // Calculate time range
    const now = Date.now();
    const timeRange = timeframe === '24h' ? 24 * 60 * 60 * 1000 :
                     timeframe === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                     30 * 24 * 60 * 60 * 1000;
    
    const cutoffDate = new Date(now - timeRange).toISOString();
    
    // Fetch data
    const [allSignals, allProviders] = await Promise.all([
      dbGetSignals(2000),
      dbGetProviders()
    ]);
    
    // Filter signals by timeframe
    const signals = allSignals.filter(s => s.timestamp >= cutoffDate);
    
    if (signals.length === 0) {
      return createSuccessResponse({
        token_trends: [],
        sentiment_analysis: {
          period: timeframe,
          bullish_signals: 0,
          bearish_signals: 0,
          neutral_signals: 0,
          sentiment_score: 0,
          sentiment_label: 'No Data'
        },
        provider_momentum: [],
        market_insights: [{
          insight: `No signals found in the last ${timeframe}`,
          type: 'alert' as const,
          confidence: 5
        }]
      });
    }
    
    // Create provider lookup
    const providerLookup = new Map();
    allProviders.forEach(p => {
      providerLookup.set(p.address.toLowerCase(), p);
    });
    
    // 1. Token Trends Analysis
    const tokenStats = new Map();
    signals.forEach(signal => {
      const token = signal.token;
      if (!tokenStats.has(token)) {
        tokenStats.set(token, {
          signals: [],
          totalPnL: 0,
          wins: 0,
          lastSignal: signal.timestamp
        });
      }
      
      const stats = tokenStats.get(token);
      stats.signals.push(signal);
      
      if (signal.pnl_pct !== null) {
        stats.totalPnL += signal.pnl_pct;
        if (signal.pnl_pct > 0) stats.wins++;
      }
      
      if (new Date(signal.timestamp) > new Date(stats.lastSignal)) {
        stats.lastSignal = signal.timestamp;
      }
    });
    
    const tokenTrends = Array.from(tokenStats.entries())
      .map(([token, stats]) => {
        const closedSignals = stats.signals.filter(s => s.pnl_pct !== null);
        return {
          token,
          signal_count: stats.signals.length,
          avg_pnl: closedSignals.length > 0 ? stats.totalPnL / closedSignals.length : 0,
          win_rate: closedSignals.length > 0 ? Math.round((stats.wins / closedSignals.length) * 100) : 0,
          last_signal: stats.lastSignal,
          momentum: calculateMomentum(stats.signals, timeframe)
        };
      })
      .sort((a, b) => b.signal_count - a.signal_count)
      .slice(0, 20);
    
    // 2. Sentiment Analysis
    const bullishSignals = signals.filter(s => s.action === 'LONG').length;
    const bearishSignals = signals.filter(s => s.action === 'SHORT').length;
    const neutralSignals = signals.filter(s => !['LONG', 'SHORT'].includes(s.action)).length;
    
    const totalDirectionalSignals = bullishSignals + bearishSignals;
    const sentimentScore = totalDirectionalSignals > 0 ? 
      (bullishSignals - bearishSignals) / totalDirectionalSignals : 0;
    
    const sentimentLabel = sentimentScore > 0.3 ? 'Bullish' :
                          sentimentScore < -0.3 ? 'Bearish' :
                          Math.abs(sentimentScore) < 0.1 ? 'Neutral' : 'Mixed';
    
    const sentimentAnalysis = {
      period: timeframe,
      bullish_signals: bullishSignals,
      bearish_signals: bearishSignals,
      neutral_signals: neutralSignals,
      sentiment_score: sentimentScore,
      sentiment_label: sentimentLabel
    };
    
    // 3. Provider Momentum
    const providerStats = new Map();
    signals.forEach(signal => {
      const address = signal.provider.toLowerCase();
      if (!providerStats.has(address)) {
        providerStats.set(address, {
          signals: [],
          totalPnL: 0,
          closedSignals: 0
        });
      }
      
      const stats = providerStats.get(address);
      stats.signals.push(signal);
      
      if (signal.pnl_pct !== null) {
        stats.totalPnL += signal.pnl_pct;
        stats.closedSignals++;
      }
    });
    
    const providerMomentum = Array.from(providerStats.entries())
      .map(([address, stats]) => {
        const provider = providerLookup.get(address);
        return {
          provider: address,
          provider_name: provider?.name || 'Unknown Provider',
          recent_performance: stats.closedSignals > 0 ? stats.totalPnL / stats.closedSignals : 0,
          streak: calculateWinStreak(stats.signals),
          trend: calculateProviderTrend(stats.signals)
        };
      })
      .filter(p => p.provider_name !== 'Unknown Provider')
      .sort((a, b) => b.recent_performance - a.recent_performance)
      .slice(0, 10);
    
    // 4. Market Insights
    const marketInsights = generateMarketInsights(
      tokenTrends,
      sentimentAnalysis,
      providerMomentum
    );
    
    const trendData: TrendData = {
      token_trends: tokenTrends,
      sentiment_analysis: sentimentAnalysis,
      provider_momentum: providerMomentum,
      market_insights: marketInsights
    };
    
    return createSuccessResponse(trendData);
    
  } catch (error: any) {
    console.error('Trends API error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to generate trends analysis',
      500
    );
  }
}