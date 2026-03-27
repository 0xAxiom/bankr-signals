import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse, APIErrorCode } from '@/lib/api-utils';
import { dbGetSignals, dbGetProviders } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface WeeklyPulse {
  period: {
    start: string;
    end: string;
    week_number: number;
  };
  summary: {
    total_signals: number;
    active_providers: number;
    avg_pnl: number;
    win_rate: number;
    top_performer: string;
    market_sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  };
  highlights: {
    best_signal: any;
    worst_signal: any;
    longest_streak: any;
    most_active_provider: any;
    trending_tokens: string[];
  };
  insights: {
    title: string;
    description: string;
    type: 'performance' | 'trend' | 'risk' | 'opportunity';
  }[];
  provider_spotlight: {
    provider: any;
    performance_summary: string;
    notable_signals: any[];
  };
  market_themes: {
    theme: string;
    signals_count: number;
    avg_performance: number;
    description: string;
  }[];
  next_week_outlook: {
    sentiment: string;
    key_factors: string[];
    tokens_to_watch: string[];
  };
}

function getWeekDates() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  
  // Calculate start of the week (Monday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Calculate end of the week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  // Get week number
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((startOfWeek.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay()) / 7);
  
  return {
    start: startOfWeek.toISOString(),
    end: endOfWeek.toISOString(),
    week_number: weekNumber
  };
}

function analyzeSignalPerformance(signals: any[]) {
  const closedSignals = signals.filter(s => s.status === 'closed' && s.pnl_pct !== null);
  
  if (closedSignals.length === 0) {
    return { avg_pnl: 0, win_rate: 0 };
  }
  
  const totalPnL = closedSignals.reduce((sum, s) => sum + s.pnl_pct, 0);
  const wins = closedSignals.filter(s => s.pnl_pct > 0).length;
  
  return {
    avg_pnl: totalPnL / closedSignals.length,
    win_rate: Math.round((wins / closedSignals.length) * 100)
  };
}

function findBestAndWorstSignals(signals: any[]) {
  const closedSignals = signals.filter(s => s.status === 'closed' && s.pnl_pct !== null);
  
  if (closedSignals.length === 0) {
    return { best: null, worst: null };
  }
  
  const sorted = closedSignals.sort((a, b) => b.pnl_pct - a.pnl_pct);
  
  return {
    best: sorted[0],
    worst: sorted[sorted.length - 1]
  };
}

function findProviderStreaks(signals: any[], providers: any[]) {
  const providerSignals = new Map();
  
  // Group signals by provider
  signals.forEach(signal => {
    if (!providerSignals.has(signal.provider)) {
      providerSignals.set(signal.provider, []);
    }
    providerSignals.get(signal.provider).push(signal);
  });
  
  let longestStreak = { provider: null, streak: 0, signals: [] };
  
  for (const [providerAddr, providerSigs] of providerSignals) {
    const closedSigs = providerSigs
      .filter(s => s.status === 'closed' && s.pnl_pct !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    let currentStreak = 0;
    let streakSignals = [];
    
    for (const signal of closedSigs) {
      if (signal.pnl_pct > 0) {
        currentStreak++;
        streakSignals.push(signal);
      } else {
        break;
      }
    }
    
    if (currentStreak > longestStreak.streak) {
      const provider = providers.find(p => p.address.toLowerCase() === providerAddr.toLowerCase());
      longestStreak = {
        provider: provider || { name: 'Unknown', address: providerAddr },
        streak: currentStreak,
        signals: streakSignals
      };
    }
  }
  
  return longestStreak.streak > 0 ? longestStreak : null;
}

function getMostActiveProvider(signals: any[], providers: any[]) {
  const providerCounts = new Map();
  
  signals.forEach(signal => {
    const count = providerCounts.get(signal.provider) || 0;
    providerCounts.set(signal.provider, count + 1);
  });
  
  if (providerCounts.size === 0) return null;
  
  const [mostActiveAddr, signalCount] = Array.from(providerCounts.entries())
    .sort(([,a], [,b]) => b - a)[0];
  
  const provider = providers.find(p => p.address.toLowerCase() === mostActiveAddr.toLowerCase());
  
  return {
    provider: provider || { name: 'Unknown', address: mostActiveAddr },
    signal_count: signalCount
  };
}

function getTrendingTokens(signals: any[], limit = 5) {
  const tokenCounts = new Map();
  
  signals.forEach(signal => {
    const count = tokenCounts.get(signal.token) || 0;
    tokenCounts.set(signal.token, count + 1);
  });
  
  return Array.from(tokenCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([token]) => token);
}

function analyzeMarketThemes(signals: any[]) {
  // Group by action type
  const themes = new Map();
  
  signals.forEach(signal => {
    const theme = signal.action === 'LONG' ? 'Long Positions' : 
                 signal.action === 'SHORT' ? 'Short Positions' : 'Other Strategies';
    
    if (!themes.has(theme)) {
      themes.set(theme, { signals: [], totalPnL: 0, count: 0 });
    }
    
    const themeData = themes.get(theme);
    themeData.signals.push(signal);
    themeData.count++;
    
    if (signal.pnl_pct !== null) {
      themeData.totalPnL += signal.pnl_pct;
    }
  });
  
  // Analyze by token type (simplified categorization)
  const tokenThemes = new Map();
  signals.forEach(signal => {
    const token = signal.token.toUpperCase();
    let category = 'Altcoins';
    
    if (['BTC', 'BITCOIN'].includes(token)) category = 'Bitcoin';
    else if (['ETH', 'ETHEREUM'].includes(token)) category = 'Ethereum';
    else if (['SOL', 'SOLANA'].includes(token)) category = 'Solana';
    else if (['USDC', 'USDT', 'DAI'].includes(token)) category = 'Stablecoins';
    
    if (!tokenThemes.has(category)) {
      tokenThemes.set(category, { signals: [], totalPnL: 0, count: 0 });
    }
    
    const themeData = tokenThemes.get(category);
    themeData.signals.push(signal);
    themeData.count++;
    
    if (signal.pnl_pct !== null) {
      themeData.totalPnL += signal.pnl_pct;
    }
  });
  
  // Combine and format themes
  const allThemes = [...themes.entries(), ...tokenThemes.entries()];
  
  return allThemes
    .filter(([, data]) => data.count >= 2) // Only include themes with 2+ signals
    .map(([theme, data]) => ({
      theme,
      signals_count: data.count,
      avg_performance: data.signals.filter(s => s.pnl_pct !== null).length > 0 
        ? data.totalPnL / data.signals.filter(s => s.pnl_pct !== null).length 
        : 0,
      description: generateThemeDescription(theme, data)
    }))
    .sort((a, b) => b.signals_count - a.signals_count)
    .slice(0, 5);
}

function generateThemeDescription(theme: string, data: any) {
  const avgPnL = data.signals.filter((s: any) => s.pnl_pct !== null).length > 0 
    ? data.totalPnL / data.signals.filter((s: any) => s.pnl_pct !== null).length 
    : 0;
  
  const performance = avgPnL > 5 ? 'strong performance' : 
                    avgPnL > 0 ? 'positive results' : 'mixed results';
  
  return `${data.count} signals with ${performance} (${avgPnL.toFixed(1)}% avg)`;
}

function generateInsights(signals: any[], performance: any, providers: any[]) {
  const insights = [];
  
  // Performance insight
  if (performance.win_rate > 70) {
    insights.push({
      title: 'High Win Rate Week',
      description: `Agents achieved ${performance.win_rate}% win rate, significantly above typical market performance`,
      type: 'performance' as const
    });
  } else if (performance.win_rate < 30) {
    insights.push({
      title: 'Challenging Market Conditions',
      description: `${performance.win_rate}% win rate suggests difficult trading conditions this week`,
      type: 'risk' as const
    });
  }
  
  // Volume insight
  if (signals.length > 50) {
    insights.push({
      title: 'High Activity Week',
      description: `${signals.length} signals published - elevated market participation indicates increased volatility`,
      type: 'trend' as const
    });
  } else if (signals.length < 10) {
    insights.push({
      title: 'Low Signal Volume',
      description: `Only ${signals.length} signals this week - agents may be waiting for clearer market direction`,
      type: 'trend' as const
    });
  }
  
  // PnL insight
  if (performance.avg_pnl > 10) {
    insights.push({
      title: 'Exceptional Returns',
      description: `Average PnL of ${performance.avg_pnl.toFixed(1)}% indicates strong market momentum and effective strategies`,
      type: 'opportunity' as const
    });
  }
  
  // Provider diversity insight
  const activeProviders = new Set(signals.map(s => s.provider)).size;
  if (activeProviders < 3) {
    insights.push({
      title: 'Concentrated Signal Sources',
      description: `Signals from only ${activeProviders} provider(s) - consider diversifying strategy sources`,
      type: 'risk' as const
    });
  }
  
  return insights.slice(0, 4); // Limit to 4 insights
}

function selectProviderSpotlight(signals: any[], providers: any[]) {
  const providerStats = new Map();
  
  signals.forEach(signal => {
    if (!providerStats.has(signal.provider)) {
      providerStats.set(signal.provider, {
        signals: [],
        totalPnL: 0,
        wins: 0,
        closedSignals: 0
      });
    }
    
    const stats = providerStats.get(signal.provider);
    stats.signals.push(signal);
    
    if (signal.pnl_pct !== null) {
      stats.totalPnL += signal.pnl_pct;
      stats.closedSignals++;
      if (signal.pnl_pct > 0) stats.wins++;
    }
  });
  
  // Find best performing provider with meaningful activity
  let bestProvider = null;
  let bestScore = -Infinity;
  
  for (const [providerAddr, stats] of providerStats) {
    if (stats.closedSignals >= 2) { // Minimum 2 closed signals
      const avgPnL = stats.totalPnL / stats.closedSignals;
      const winRate = stats.wins / stats.closedSignals;
      const score = avgPnL * 0.7 + winRate * 30; // Weight PnL and win rate
      
      if (score > bestScore) {
        bestScore = score;
        const provider = providers.find(p => p.address.toLowerCase() === providerAddr.toLowerCase());
        bestProvider = {
          provider: provider || { name: 'Unknown', address: providerAddr },
          stats
        };
      }
    }
  }
  
  if (!bestProvider) return null;
  
  const { provider, stats } = bestProvider;
  const avgPnL = stats.totalPnL / stats.closedSignals;
  const winRate = Math.round((stats.wins / stats.closedSignals) * 100);
  
  return {
    provider,
    performance_summary: `${winRate}% win rate with ${avgPnL.toFixed(1)}% average PnL across ${stats.signals.length} signals`,
    notable_signals: stats.signals
      .filter(s => s.pnl_pct !== null)
      .sort((a, b) => b.pnl_pct - a.pnl_pct)
      .slice(0, 3)
  };
}

function generateNextWeekOutlook(signals: any[], marketThemes: any[]) {
  const recentSignals = signals.filter(s => 
    new Date(s.timestamp) > new Date(Date.now() - 48 * 60 * 60 * 1000) // Last 48 hours
  );
  
  const bullishSignals = recentSignals.filter(s => s.action === 'LONG').length;
  const bearishSignals = recentSignals.filter(s => s.action === 'SHORT').length;
  
  const sentiment = bullishSignals > bearishSignals * 1.5 ? 'Bullish momentum building' :
                   bearishSignals > bullishSignals * 1.5 ? 'Bearish sentiment emerging' :
                   'Mixed signals suggest consolidation';
  
  const keyFactors = [];
  if (marketThemes.length > 0) {
    keyFactors.push(`${marketThemes[0].theme} trend continuing`);
  }
  
  if (recentSignals.length > signals.length * 0.4) {
    keyFactors.push('Accelerating signal volume');
  }
  
  const performance = analyzeSignalPerformance(signals);
  if (performance.win_rate > 60) {
    keyFactors.push('Sustained high win rates');
  } else if (performance.win_rate < 40) {
    keyFactors.push('Market uncertainty persisting');
  }
  
  const tokensToWatch = getTrendingTokens(recentSignals, 3);
  
  return {
    sentiment,
    key_factors: keyFactors.length > 0 ? keyFactors : ['Monitor signal volume for direction'],
    tokens_to_watch: tokensToWatch.length > 0 ? tokensToWatch : ['Watch for new trends']
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekOffset = parseInt(searchParams.get('week') || '0'); // 0 = current week, -1 = last week, etc.
    
    // Calculate date range for the target week
    let weekDates = getWeekDates();
    
    if (weekOffset !== 0) {
      const offsetMs = weekOffset * 7 * 24 * 60 * 60 * 1000;
      const startDate = new Date(weekDates.start);
      const endDate = new Date(weekDates.end);
      
      startDate.setTime(startDate.getTime() + offsetMs);
      endDate.setTime(endDate.getTime() + offsetMs);
      
      weekDates = {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        week_number: weekDates.week_number + weekOffset
      };
    }
    
    // Fetch data for the week
    const [allSignals, allProviders] = await Promise.all([
      dbGetSignals(2000),
      dbGetProviders()
    ]);
    
    // Filter signals for the target week
    const weekSignals = allSignals.filter(s => 
      s.timestamp >= weekDates.start && s.timestamp <= weekDates.end
    );
    
    if (weekSignals.length === 0) {
      return createSuccessResponse({
        period: weekDates,
        summary: {
          total_signals: 0,
          active_providers: 0,
          avg_pnl: 0,
          win_rate: 0,
          top_performer: 'No data',
          market_sentiment: 'neutral' as const
        },
        highlights: null,
        insights: [{
          title: 'No Activity',
          description: 'No signals recorded for this week',
          type: 'trend' as const
        }],
        provider_spotlight: null,
        market_themes: [],
        next_week_outlook: {
          sentiment: 'Awaiting market activity',
          key_factors: ['Monitor for signal activity'],
          tokens_to_watch: []
        }
      });
    }
    
    // Calculate summary metrics
    const performance = analyzeSignalPerformance(weekSignals);
    const activeProviders = new Set(weekSignals.map(s => s.provider)).size;
    
    // Determine market sentiment
    const bullishSignals = weekSignals.filter(s => s.action === 'LONG').length;
    const bearishSignals = weekSignals.filter(s => s.action === 'SHORT').length;
    const marketSentiment = bullishSignals > bearishSignals * 1.3 ? 'bullish' :
                          bearishSignals > bullishSignals * 1.3 ? 'bearish' :
                          Math.abs(bullishSignals - bearishSignals) < 3 ? 'neutral' : 'mixed';
    
    // Find highlights
    const { best, worst } = findBestAndWorstSignals(weekSignals);
    const longestStreak = findProviderStreaks(weekSignals, allProviders);
    const mostActive = getMostActiveProvider(weekSignals, allProviders);
    const trendingTokens = getTrendingTokens(weekSignals);
    
    // Generate insights and analysis
    const insights = generateInsights(weekSignals, performance, allProviders);
    const providerSpotlight = selectProviderSpotlight(weekSignals, allProviders);
    const marketThemes = analyzeMarketThemes(weekSignals);
    const nextWeekOutlook = generateNextWeekOutlook(weekSignals, marketThemes);
    
    // Find top performer
    const topPerformer = best ? 
      (allProviders.find(p => p.address.toLowerCase() === best.provider.toLowerCase())?.name || 'Unknown') :
      'No data';
    
    const weeklyPulse: WeeklyPulse = {
      period: weekDates,
      summary: {
        total_signals: weekSignals.length,
        active_providers: activeProviders,
        avg_pnl: Math.round(performance.avg_pnl * 100) / 100,
        win_rate: performance.win_rate,
        top_performer: topPerformer,
        market_sentiment: marketSentiment
      },
      highlights: {
        best_signal: best,
        worst_signal: worst,
        longest_streak: longestStreak,
        most_active_provider: mostActive,
        trending_tokens: trendingTokens
      },
      insights,
      provider_spotlight: providerSpotlight,
      market_themes: marketThemes,
      next_week_outlook: nextWeekOutlook
    };
    
    return createSuccessResponse(weeklyPulse);
    
  } catch (error: any) {
    console.error('Weekly pulse API error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to generate weekly pulse',
      500
    );
  }
}