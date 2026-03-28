import { NextRequest, NextResponse } from 'next/server';
import { dbGetSignals, dbGetProviders } from '@/lib/db';
import { createSuccessResponse, createErrorResponse, APIErrorCode } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

interface WeekendAnalysis {
  week_summary: {
    total_signals: number;
    active_providers: number;
    avg_pnl: number;
    win_rate: number;
    best_performer: {
      provider: string;
      pnl: number;
      win_rate: number;
      signals_count: number;
    } | null;
    worst_performer: {
      provider: string;
      pnl: number;
      signals_count: number;
    } | null;
  };
  market_sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral';
    long_signals: number;
    short_signals: number;
    confidence: number;
  };
  top_tokens: Array<{
    token: string;
    signals_count: number;
    avg_pnl: number;
    win_rate: number;
    most_recent: string;
  }>;
  insights: string[];
  open_positions: Array<{
    token: string;
    action: string;
    provider: string;
    entry_price: number;
    leverage: number | null;
    reasoning: string;
    confidence: number;
    hours_open: number;
  }>;
  weekend_tweet: {
    text: string;
    type: 'weekend_summary';
    hashtags: string[];
  };
}

function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${pnl.toFixed(1)}%`;
}

function getHoursAgo(timestamp: string): number {
  return Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tweetsOnly = searchParams.get('tweets_only') === 'true';
    
    // Get data for the past 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [allSignals, providers] = await Promise.all([
      dbGetSignals(1000),
      dbGetProviders()
    ]);

    // Filter signals to the past week
    const weekSignals = allSignals.filter(s => new Date(s.timestamp) >= weekAgo);
    
    // Create provider lookup
    const providerMap = new Map();
    providers.forEach(p => {
      providerMap.set(p.address.toLowerCase(), p);
    });

    // Add provider info to signals
    const enhancedSignals = weekSignals.map(s => ({
      ...s,
      provider_info: providerMap.get(s.provider.toLowerCase())
    })).filter(s => s.provider_info);

    // Calculate week summary
    const closedSignals = enhancedSignals.filter(s => s.status === 'closed' && s.pnl_pct !== null);
    const totalPnL = closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0);
    const wins = closedSignals.filter(s => (s.pnl_pct || 0) > 0).length;
    
    // Calculate per-provider stats
    const providerStats = new Map();
    closedSignals.forEach(signal => {
      const addr = signal.provider.toLowerCase();
      if (!providerStats.has(addr)) {
        providerStats.set(addr, {
          provider: signal.provider_info,
          signals: [],
          total_pnl: 0,
          wins: 0
        });
      }
      const stats = providerStats.get(addr);
      stats.signals.push(signal);
      stats.total_pnl += signal.pnl_pct || 0;
      if ((signal.pnl_pct || 0) > 0) stats.wins++;
    });

    let bestPerformer = null;
    let worstPerformer = null;
    let bestScore = -Infinity;
    let worstScore = Infinity;

    for (const [_, stats] of providerStats) {
      if (stats.signals.length >= 2) {
        const avgPnL = stats.total_pnl / stats.signals.length;
        const winRate = stats.wins / stats.signals.length;
        
        if (avgPnL > bestScore) {
          bestScore = avgPnL;
          bestPerformer = {
            provider: stats.provider.name || 'Unknown',
            pnl: avgPnL,
            win_rate: winRate,
            signals_count: stats.signals.length
          };
        }
        
        if (avgPnL < worstScore && stats.signals.length >= 3) {
          worstScore = avgPnL;
          worstPerformer = {
            provider: stats.provider.name || 'Unknown',
            pnl: avgPnL,
            signals_count: stats.signals.length
          };
        }
      }
    }

    // Market sentiment analysis
    const longSignals = enhancedSignals.filter(s => s.action === 'LONG').length;
    const shortSignals = enhancedSignals.filter(s => s.action === 'SHORT').length;
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 0;

    if (longSignals > shortSignals * 1.5) {
      sentiment = 'bullish';
      confidence = Math.min(0.9, longSignals / (longSignals + shortSignals));
    } else if (shortSignals > longSignals * 1.5) {
      sentiment = 'bearish';
      confidence = Math.min(0.9, shortSignals / (longSignals + shortSignals));
    }

    // Top tokens analysis
    const tokenStats = new Map();
    closedSignals.forEach(signal => {
      const token = signal.token;
      if (!tokenStats.has(token)) {
        tokenStats.set(token, {
          signals: [],
          total_pnl: 0,
          wins: 0
        });
      }
      const stats = tokenStats.get(token);
      stats.signals.push(signal);
      stats.total_pnl += signal.pnl_pct || 0;
      if ((signal.pnl_pct || 0) > 0) stats.wins++;
    });

    const topTokens = Array.from(tokenStats.entries())
      .filter(([_, stats]) => stats.signals.length >= 2)
      .map(([token, stats]) => ({
        token,
        signals_count: stats.signals.length,
        avg_pnl: stats.total_pnl / stats.signals.length,
        win_rate: stats.wins / stats.signals.length,
        most_recent: stats.signals.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
      }))
      .sort((a, b) => b.avg_pnl - a.avg_pnl)
      .slice(0, 5);

    // Generate insights
    const insights = [];
    
    if (bestPerformer && bestPerformer.pnl > 5) {
      insights.push(`🏆 ${bestPerformer.provider} dominated with ${formatPnL(bestPerformer.pnl)} avg PnL across ${bestPerformer.signals_count} trades`);
    }
    
    if (sentiment !== 'neutral') {
      const sentimentText = sentiment === 'bullish' ? '📈 Bullish' : '📉 Bearish';
      insights.push(`${sentimentText} sentiment dominated: ${sentiment === 'bullish' ? longSignals : shortSignals} ${sentiment === 'bullish' ? 'LONG' : 'SHORT'} vs ${sentiment === 'bullish' ? shortSignals : longSignals} ${sentiment === 'bullish' ? 'SHORT' : 'LONG'} signals`);
    }
    
    if (topTokens.length > 0 && topTokens[0].avg_pnl > 3) {
      insights.push(`🎯 ${topTokens[0].token} was the week's alpha token with ${formatPnL(topTokens[0].avg_pnl)} avg returns`);
    }
    
    const highConfidenceSignals = enhancedSignals.filter(s => s.confidence >= 0.9);
    if (highConfidenceSignals.length > 0) {
      insights.push(`🎯 ${highConfidenceSignals.length} signals published with 90%+ confidence - agents are getting bold`);
    }

    if (closedSignals.length > 0) {
      const avgPnL = totalPnL / closedSignals.length;
      const winRate = wins / closedSignals.length;
      if (winRate > 0.6) {
        insights.push(`🔥 Strong performance: ${Math.round(winRate * 100)}% win rate this week`);
      }
      if (avgPnL > 2) {
        insights.push(`💰 Profitable week overall with ${formatPnL(avgPnL)} average returns`);
      }
    }

    // Open positions analysis
    const openPositions = enhancedSignals
      .filter(s => s.status === 'open')
      .map(s => ({
        token: s.token,
        action: s.action,
        provider: s.provider_info?.name || 'Unknown',
        entry_price: s.entry_price,
        leverage: s.leverage,
        reasoning: s.reasoning || '',
        confidence: s.confidence,
        hours_open: getHoursAgo(s.timestamp)
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    // Generate weekend tweet
    const activeProviders = new Set(enhancedSignals.map(s => s.provider)).size;
    const avgPnL = closedSignals.length > 0 ? totalPnL / closedSignals.length : 0;
    const winRate = closedSignals.length > 0 ? wins / closedSignals.length : 0;

    let tweetText = `📊 Weekend Trading Wrap\n\n`;
    
    if (enhancedSignals.length > 0) {
      tweetText += `🤖 ${activeProviders} agents • ${enhancedSignals.length} signals\n`;
      if (closedSignals.length > 0) {
        tweetText += `📈 ${formatPnL(avgPnL)} avg PnL • ${Math.round(winRate * 100)}% win rate\n`;
      }
      
      const sentimentEmoji = sentiment === 'bullish' ? '📈' : sentiment === 'bearish' ? '📉' : '📊';
      tweetText += `${sentimentEmoji} ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} sentiment\n\n`;
      
      if (bestPerformer) {
        tweetText += `🏆 Top: ${bestPerformer.provider} (${formatPnL(bestPerformer.pnl)})\n`;
      }
      
      if (topTokens.length > 0) {
        tweetText += `🎯 Hot: $${topTokens[0].token} (${formatPnL(topTokens[0].avg_pnl)})\n`;
      }
      
      if (openPositions.length > 0) {
        tweetText += `⚡ ${openPositions.length} positions still active\n`;
      }
    } else {
      tweetText += `Quiet week - agents regrouping 🔄\n`;
      tweetText += `Building for next week's moves 🚀\n\n`;
      tweetText += `New agents welcome 👋\n`;
    }
    
    tweetText += `\nFull analysis: bankrsignals.com`;

    const analysis: WeekendAnalysis = {
      week_summary: {
        total_signals: enhancedSignals.length,
        active_providers: activeProviders,
        avg_pnl: avgPnL,
        win_rate: winRate,
        best_performer: bestPerformer,
        worst_performer: worstPerformer
      },
      market_sentiment: {
        overall: sentiment,
        long_signals: longSignals,
        short_signals: shortSignals,
        confidence
      },
      top_tokens: topTokens,
      insights,
      open_positions: openPositions,
      weekend_tweet: {
        text: tweetText,
        type: 'weekend_summary',
        hashtags: ['#WeekendWrap', '#AI', '#Trading', '#DeFi', '#Alpha']
      }
    };

    if (tweetsOnly) {
      return createSuccessResponse({ tweet: analysis.weekend_tweet });
    }

    return createSuccessResponse({ analysis });

  } catch (error: any) {
    console.error('Weekend analysis generation error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to generate weekend analysis',
      500
    );
  }
}