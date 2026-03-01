import { NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse, APIErrorCode } from '@/lib/api-utils';
import { selectSignalOfTheDay } from '@/lib/signal-selector';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TweetDraft {
  text: string;
  type: 'signal_spotlight' | 'performance_update' | 'market_insight';
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
    
    // If auto mode, return the best draft
    if (type === 'auto' && drafts.length > 0) {
      // Prefer signal spotlight if available, otherwise performance
      const bestDraft = drafts.find(d => d.type === 'signal_spotlight') || 
                       drafts.find(d => d.type === 'performance_update') ||
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