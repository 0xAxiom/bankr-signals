import { NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse, APIErrorCode } from '@/lib/api-utils';
import { selectSignalOfTheDay } from '@/lib/signal-selector';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TweetDraft {
  text: string;
  type: 'signal_spotlight' | 'performance_update' | 'market_insight' | 'provider_highlight' | 'platform_stats' | 'trading_wisdom';
  hashtags: string[];
  url?: string;
}

async function getTopPerformers(days: number = 7) {
  if (!supabase) return [];
  const { data: signals, error } = await supabase
    .from('signals')
    .select(`
      *,
      providers!inner(name, twitter, address)
    `)
    .eq('status', 'closed')
    .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('pnl_pct', { ascending: false })
    .limit(5);

  return signals || [];
}

async function getMarketStats() {
  if (!supabase) return { active_providers: 0, total_signals: 0 };
  // Get basic stats without RPC function
  const { data: providerStats, error: providerError } = await supabase
    .from('signal_providers')
    .select('address, total_signals')
    .gt('total_signals', 0);
  
  const { data: signalStats, error: signalError } = await supabase
    .from('signals')
    .select('id, timestamp')
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  return {
    active_providers: providerStats?.length || 0,
    total_signals: signalStats?.length || 0,
  };
}

function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${pnl.toFixed(1)}%`;
}

function generateSignalSpotlight(signal: any): TweetDraft {
  const provider = signal.providers;
  const action = signal.action.toUpperCase();
  const pnl = formatPnL(signal.pnl_pct || 0);
  const leverage = signal.leverage > 1 ? `${signal.leverage}x ` : '';
  
  const performanceEmoji = signal.pnl_pct > 10 ? '🚀' : signal.pnl_pct > 0 ? '📈' : '📉';
  
  let text = `${performanceEmoji} Signal Spotlight\n\n`;
  text += `@${provider.twitter || provider.name} called ${action} ${signal.token} ${leverage}`;
  text += `→ ${pnl} realized\n\n`;
  
  if (signal.reasoning) {
    const shortReasoning = signal.reasoning.length > 80 
      ? signal.reasoning.substring(0, 80) + '...' 
      : signal.reasoning;
    text += `💡 "${shortReasoning}"\n\n`;
  }
  
  text += `Track all signals: bankrsignals.com`;
  
  return {
    text,
    type: 'signal_spotlight',
    hashtags: ['#DeFi', '#Trading', '#AI', '#Signals'],
    url: `https://bankrsignals.com/provider/${provider.address}`
  };
}

function generatePerformanceUpdate(topSignals: any[]): TweetDraft {
  const winners = topSignals.filter(s => s.pnl_pct > 0);
  const totalPnL = topSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0);
  
  let text = `📊 Weekly Performance Update\n\n`;
  
  if (winners.length > 0) {
    text += `🏆 Top Signals:\n`;
    winners.slice(0, 3).forEach((signal, i) => {
      const provider = signal.providers;
      text += `${i + 1}. @${provider.twitter || provider.name}: ${signal.action} ${signal.token} ${formatPnL(signal.pnl_pct)}\n`;
    });
  }
  
  text += `\n💰 Avg PnL: ${formatPnL(totalPnL / Math.max(topSignals.length, 1))}\n`;
  text += `\nFollow the alpha: bankrsignals.com`;
  
  return {
    text,
    type: 'performance_update',
    hashtags: ['#TradingResults', '#DeFi', '#Alpha', '#AI'],
    url: 'https://bankrsignals.com/leaderboard'
  };
}

function generateMarketInsight(signals: any[], stats: any): TweetDraft {
  const recentSignals = signals.filter(s => 
    new Date(s.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  
  const bullishSignals = recentSignals.filter(s => s.action === 'LONG').length;
  const bearishSignals = recentSignals.filter(s => s.action === 'SHORT').length;
  
  const sentiment = bullishSignals > bearishSignals ? 'Bullish' : 
                   bearishSignals > bullishSignals ? 'Bearish' : 'Mixed';
  
  const sentimentEmoji = sentiment === 'Bullish' ? '🟢' : 
                        sentiment === 'Bearish' ? '🔴' : '🟡';
  
  let text = `${sentimentEmoji} Market Sentiment: ${sentiment}\n\n`;
  text += `📈 LONG signals: ${bullishSignals}\n`;
  text += `📉 SHORT signals: ${bearishSignals}\n\n`;
  
  if (stats?.total_signals) {
    text += `🤖 ${stats.active_providers} agents published ${stats.total_signals} signals\n`;
  }
  
  text += `\nGet the full picture: bankrsignals.com/feed`;
  
  return {
    text,
    type: 'market_insight',
    hashtags: ['#MarketSentiment', '#AI', '#Trading', '#Alpha'],
    url: 'https://bankrsignals.com/feed'
  };
}

function generateProviderHighlight(signals: any[]): TweetDraft | null {
  const providers = new Map();
  
  // Group signals by provider and calculate stats
  signals.forEach(signal => {
    const provider = signal.providers;
    if (!provider) return;
    
    if (!providers.has(provider.address)) {
      providers.set(provider.address, {
        provider,
        signals: [],
        totalPnL: 0,
        wins: 0
      });
    }
    
    const providerData = providers.get(provider.address);
    providerData.signals.push(signal);
    if (signal.pnl_pct !== null) {
      providerData.totalPnL += signal.pnl_pct;
      if (signal.pnl_pct > 0) providerData.wins++;
    }
  });
  
  // Find best performing provider
  let bestProvider = null;
  let bestScore = -Infinity;
  
  for (const [_, data] of providers) {
    if (data.signals.length >= 2) { // Only consider providers with multiple signals
      const winRate = data.wins / data.signals.filter(s => s.pnl_pct !== null).length;
      const avgPnL = data.totalPnL / data.signals.filter(s => s.pnl_pct !== null).length;
      const score = winRate * 50 + avgPnL * 2; // Weighted score
      
      if (score > bestScore) {
        bestScore = score;
        bestProvider = data;
      }
    }
  }
  
  if (!bestProvider) return null;
  
  const winRate = Math.round((bestProvider.wins / bestProvider.signals.filter(s => s.pnl_pct !== null).length) * 100);
  const avgPnL = bestProvider.totalPnL / bestProvider.signals.filter(s => s.pnl_pct !== null).length;
  
  let text = `🏆 Provider Spotlight\n\n`;
  text += `@${bestProvider.provider.twitter || bestProvider.provider.name}\n`;
  text += `${bestProvider.signals.length} signals • ${winRate}% win rate\n`;
  text += `Avg PnL: ${formatPnL(avgPnL)}\n\n`;
  text += `Follow their strategy: bankrsignals.com/provider/${bestProvider.provider.address}`;
  
  return {
    text,
    type: 'provider_highlight',
    hashtags: ['#TopTrader', '#Alpha', '#AI', '#DeFi'],
    url: `https://bankrsignals.com/provider/${bestProvider.provider.address}`
  };
}

function generatePlatformStats(stats: any): TweetDraft {
  const insights = [
    {
      text: `🚀 Platform Growth\n\n📊 ${stats.active_providers} active signal providers\n🎯 ${stats.total_signals} verified signals published\n⚡ 100% transaction-verified results\n\nThe future of transparent trading is here\n\nbankrsignals.com`,
      focus: 'growth'
    },
    {
      text: `🔍 Why Bankr Signals?\n\n✅ No fake results (tx hash required)\n✅ Real-time PnL tracking\n✅ Copy-tradeable strategies\n✅ Public performance history\n\nFinally, trading signals you can trust\n\nbankrsignals.com`,
      focus: 'trust'
    },
    {
      text: `🤖 Agent Trading Revolution\n\n• No emotions, pure data\n• 24/7 market monitoring\n• Backtested strategies\n• Transparent track records\n\nWatch the best AI traders: bankrsignals.com`,
      focus: 'ai'
    }
  ];
  
  // Rotate insights based on day
  const dayOfWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % insights.length;
  const insight = insights[dayOfWeek];
  
  return {
    text: insight.text,
    type: 'platform_stats',
    hashtags: ['#DeFi', '#AI', '#Trading', '#Transparency'],
    url: 'https://bankrsignals.com'
  };
}

function generateTradingWisdom(): TweetDraft {
  const wisdomPosts = [
    {
      text: `💡 Trading Wisdom #1\n\n"Position sizing is everything"\n\n🎯 Risk 1-2% per trade\n🎯 Use stop losses religiously\n🎯 Let winners run, cut losers fast\n\nSee how the pros size positions:\nbankrsignals.com`,
      topic: 'risk_management'
    },
    {
      text: `💡 Trading Wisdom #2\n\n"Backtesting beats gut feeling"\n\n📊 Test your strategy on historical data\n📊 Track every metric that matters\n📊 Adapt when markets change\n\nWatch data-driven traders: bankrsignals.com`,
      topic: 'backtesting'
    },
    {
      text: `💡 Trading Wisdom #3\n\n"Transparency builds trust"\n\n🔍 Share your reasoning\n🔍 Show your track record\n🔍 Own your mistakes\n\nFollow transparent traders: bankrsignals.com`,
      topic: 'transparency'
    },
    {
      text: `💡 Trading Wisdom #4\n\n"Timing beats picking"\n\n⏰ Entry timing > coin selection\n⏰ Risk management > profit targets\n⏰ Consistency > home runs\n\nSee perfect timing: bankrsignals.com`,
      topic: 'timing'
    }
  ];
  
  // Rotate wisdom posts
  const postIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % wisdomPosts.length;
  const wisdom = wisdomPosts[postIndex];
  
  return {
    text: wisdom.text,
    type: 'trading_wisdom',
    hashtags: ['#TradingWisdom', '#DeFi', '#Alpha', '#Education'],
    url: 'https://bankrsignals.com'
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as string || 'auto';
    const days = parseInt(searchParams.get('days') || '7');
    
    const [topSignals, marketStats] = await Promise.all([
      getTopPerformers(days),
      getMarketStats()
    ]);
    
    let drafts: TweetDraft[] = [];
    
    if (type === 'auto' || type === 'signal_spotlight') {
      const signalOfDay = await selectSignalOfTheDay();
      if (signalOfDay?.signal.pnl_pct !== undefined) {
        const spotlight = generateSignalSpotlight({
          ...signalOfDay.signal,
          providers: signalOfDay.provider
        });
        drafts.push(spotlight);
      }
    }
    
    if (type === 'auto' || type === 'performance_update') {
      if (topSignals.length > 0) {
        const performance = generatePerformanceUpdate(topSignals);
        drafts.push(performance);
      }
    }
    
    if (type === 'auto' || type === 'market_insight') {
      const insight = generateMarketInsight(topSignals, marketStats);
      drafts.push(insight);
    }
    
    if (type === 'auto' || type === 'provider_highlight') {
      if (topSignals.length > 0) {
        const highlight = generateProviderHighlight(topSignals);
        if (highlight) drafts.push(highlight);
      }
    }
    
    if (type === 'auto' || type === 'platform_stats') {
      const stats = generatePlatformStats(marketStats);
      drafts.push(stats);
    }
    
    if (type === 'auto' || type === 'trading_wisdom') {
      const wisdom = generateTradingWisdom();
      drafts.push(wisdom);
    }
    
    // If auto mode, return the best draft with smarter selection
    if (type === 'auto' && drafts.length > 0) {
      // Preference order: signal spotlight > provider highlight > performance > platform stats > trading wisdom > market insight
      const bestDraft = drafts.find(d => d.type === 'signal_spotlight') || 
                       drafts.find(d => d.type === 'provider_highlight') ||
                       drafts.find(d => d.type === 'performance_update') ||
                       drafts.find(d => d.type === 'platform_stats') ||
                       drafts.find(d => d.type === 'trading_wisdom') ||
                       drafts[0];
      return createSuccessResponse({ draft: bestDraft });
    }
    
    return createSuccessResponse({ 
      drafts: type === 'auto' ? [drafts[0] || null] : drafts,
      count: drafts.length 
    });
    
  } catch (error: any) {
    console.error('Tweet draft generation error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to generate tweet draft',
      500
    );
  }
}