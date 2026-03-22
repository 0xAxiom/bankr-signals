/**
 * Weekly digest stats API endpoint
 * Provides real data for the weekly digest page
 * Reuses the same logic as the weekly email digest cron
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, APIErrorCode } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface WeeklyStatsResponse {
  totalSignals: number;
  activeProviders: number;
  topPerformer: {
    name: string;
    winRate: number;
    totalSignals: number;
    address: string;
    avgPnL: number;
    twitter?: string;
  } | null;
  weeklyGrowth: {
    newProviders: number;
    newSignals: number;
  };
  marketInsights: {
    avgPnL: number;
    winRate: number;
    topToken: string;
    sentiment: 'bullish' | 'bearish' | 'mixed';
  };
  featuredSignals: Array<{
    id: string;
    provider: string;
    action: string;
    token: string;
    pnl: number;
    reasoning: string;
    timestamp: string;
    providerAddress: string;
  }>;
  newProviders: Array<{
    name: string;
    address: string;
    registeredAt: string;
    twitter?: string;
  }>;
  hotStreaks: Array<{
    provider: string;
    streak: number;
    avgPnL: number;
    address: string;
  }>;
}

async function generateWeeklyStats(): Promise<WeeklyStatsResponse | null> {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get signals from the past week
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select(`
        *,
        signal_providers:provider (
          name,
          address,
          twitter,
          verified
        )
      `)
      .gte('timestamp', oneWeekAgo)
      .order('timestamp', { ascending: false });
    
    if (signalsError || !signals) {
      console.error('Error fetching signals:', signalsError);
      return null;
    }

    // Get all providers to calculate active count
    const { data: allProviders, error: allProvidersError } = await supabase
      .from('signal_providers')
      .select('*');
    
    if (allProvidersError) {
      console.error('Error fetching all providers:', allProvidersError);
    }

    // Get new providers from this week
    const { data: newProviders, error: newProvidersError } = await supabase
      .from('signal_providers')
      .select('name, address, registered_at, twitter')
      .gte('registered_at', oneWeekAgo)
      .order('registered_at', { ascending: false });
    
    if (newProvidersError) {
      console.error('Error fetching new providers:', newProvidersError);
    }

    // Process signals
    const closedSignals = signals.filter(s => s.status === 'closed' && s.pnl_pct !== null);
    const winningSignals = closedSignals.filter(s => s.pnl_pct > 0);
    
    // Featured signals (top 3 by PnL)
    const topSignalsByPnL = closedSignals
      .filter(s => s.signal_providers && s.reasoning)
      .sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0))
      .slice(0, 3);

    const featuredSignals = topSignalsByPnL.map(signal => ({
      id: signal.id,
      provider: signal.signal_providers?.name || 'Anonymous',
      action: signal.action.toUpperCase(),
      token: signal.token || signal.asset,
      pnl: signal.pnl_pct || 0,
      reasoning: signal.reasoning || '',
      timestamp: signal.timestamp,
      providerAddress: signal.signal_providers?.address || signal.provider,
    }));

    // Calculate provider stats for this week
    const providerStats = new Map();
    
    closedSignals.forEach(signal => {
      const provider = signal.signal_providers;
      if (!provider) return;
      
      const key = provider.address;
      if (!providerStats.has(key)) {
        providerStats.set(key, {
          provider,
          signals: [],
          totalPnL: 0,
          wins: 0,
        });
      }
      
      const stats = providerStats.get(key);
      stats.signals.push(signal);
      stats.totalPnL += signal.pnl_pct || 0;
      if (signal.pnl_pct > 0) stats.wins++;
    });

    // Find top performer
    let topPerformer = null;
    if (providerStats.size > 0) {
      const topProviderEntry = Array.from(providerStats.values())
        .filter(p => p.signals.length >= 2) // Minimum 2 signals for reliability
        .map(p => ({
          ...p.provider,
          signalCount: p.signals.length,
          avgPnL: p.totalPnL / p.signals.length,
          winRate: p.wins / p.signals.length,
          score: (p.totalPnL / p.signals.length) + (p.wins / p.signals.length) * 10
        }))
        .sort((a, b) => b.score - a.score)[0];

      if (topProviderEntry) {
        topPerformer = {
          name: topProviderEntry.name || 'Anonymous',
          winRate: topProviderEntry.winRate,
          totalSignals: topProviderEntry.signalCount,
          address: topProviderEntry.address,
          avgPnL: topProviderEntry.avgPnL,
          twitter: topProviderEntry.twitter,
        };
      }
    }

    // Market insights
    const avgPnL = closedSignals.length > 0 
      ? closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / closedSignals.length 
      : 0;
    
    const winRate = closedSignals.length > 0 
      ? winningSignals.length / closedSignals.length 
      : 0;

    // Top token analysis
    const tokenCounts = new Map();
    signals.forEach(s => {
      const token = s.token || s.asset;
      if (token) {
        tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
      }
    });
    
    const topToken = Array.from(tokenCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'ETH';

    // Sentiment analysis based on LONG vs SHORT signals
    const longSignals = signals.filter(s => 
      s.action?.toUpperCase() === 'LONG' || s.action?.toUpperCase() === 'BUY'
    ).length;
    const shortSignals = signals.filter(s => 
      s.action?.toUpperCase() === 'SHORT' || s.action?.toUpperCase() === 'SELL'
    ).length;
    
    const sentiment: 'bullish' | 'bearish' | 'mixed' = 
      longSignals > shortSignals * 1.5 ? 'bullish' :
      shortSignals > longSignals * 1.5 ? 'bearish' : 'mixed';

    // Detect hot streaks (3+ wins in a row)
    const hotStreaks = Array.from(providerStats.values())
      .map(p => {
        const recentSignals = p.signals
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5); // Check last 5 signals
        
        let streak = 0;
        for (const signal of recentSignals) {
          if (signal.pnl_pct > 0) {
            streak++;
          } else {
            break;
          }
        }
        
        return streak >= 3 ? {
          provider: p.provider.name || 'Anonymous',
          streak,
          avgPnL: recentSignals.slice(0, streak).reduce((sum, s) => sum + s.pnl_pct, 0) / streak,
          address: p.provider.address
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 3);

    // Count active providers (providers with at least 1 signal in the past week)
    const activeProvidersCount = new Set(
      signals
        .filter(s => s.signal_providers?.address)
        .map(s => s.signal_providers.address)
    ).size;

    return {
      totalSignals: signals.length,
      activeProviders: activeProvidersCount,
      topPerformer,
      weeklyGrowth: {
        newProviders: newProviders?.length || 0,
        newSignals: signals.length,
      },
      marketInsights: {
        avgPnL,
        winRate,
        topToken,
        sentiment,
      },
      featuredSignals,
      newProviders: (newProviders || []).map(p => ({
        name: p.name || 'Anonymous',
        address: p.address,
        registeredAt: p.registered_at,
        twitter: p.twitter,
      })),
      hotStreaks,
    };
    
  } catch (error) {
    console.error('Error generating weekly stats:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const stats = await generateWeeklyStats();
    
    if (!stats) {
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Failed to generate weekly stats",
        500
      );
    }

    return createSuccessResponse(stats);

  } catch (error: any) {
    console.error("Weekly stats API error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Failed to fetch weekly stats",
      500,
      { error: error.message }
    );
  }
}