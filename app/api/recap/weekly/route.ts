import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mockProviders, mockSignals } from '@/lib/mock-data';

// Use mock data in development when Supabase isn't configured
const isDev = process.env.NODE_ENV === 'development';
const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any = null;
if (hasSupabaseConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get week range for display
    const weekRange = `${oneWeekAgo.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}-${now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })}`;

    let weeklySignals: any[];
    let allProviders: any[];

    if (!hasSupabaseConfig || isDev) {
      // Use mock data for development
      console.log('Using mock data for weekly recap');
      
      // Filter mock signals to simulate "this week"
      weeklySignals = mockSignals.map(signal => ({
        ...signal,
        created_at: signal.timestamp,
        providers: {
          name: mockProviders.find(p => p.address === signal.provider)?.name || 'Unknown',
          address: signal.provider
        }
      }));
      
      allProviders = mockProviders;
    } else {
      // Use real Supabase data for production
      const { data: signals, error: signalsError } = await supabase
        .from('signals')
        .select(`
          *,
          providers!inner(name, address)
        `)
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (signalsError) {
        console.error('Error fetching weekly signals:', signalsError);
        throw new Error('Failed to fetch signals data');
      }

      const { data: providers, error: providersError } = await supabase
        .from('providers')
        .select('*');

      if (providersError) {
        console.error('Error fetching providers:', providersError);
        throw new Error('Failed to fetch providers data');
      }

      weeklySignals = signals;
      allProviders = providers;
    }

    // Calculate provider stats for this week
    const providerStats = weeklySignals.reduce((acc, signal) => {
      const providerId = signal.provider;
      if (!acc[providerId]) {
        acc[providerId] = {
          name: signal.providers.name,
          address: signal.providers.address,
          signals: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0
        };
      }
      
      acc[providerId].signals++;
      
      if (signal.status === 'closed' && signal.pnl_pct !== null) {
        acc[providerId].totalPnl += signal.pnl_pct;
        if (signal.pnl_pct > 0) {
          acc[providerId].wins++;
        } else {
          acc[providerId].losses++;
        }
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Find best performer (highest total PnL this week)
    const bestPerformer = Object.values(providerStats).reduce((best: any, current: any) => {
      if (!best || current.totalPnl > best.totalPnl) {
        return {
          name: current.name,
          address: current.address,
          weeklyPnl: parseFloat(current.totalPnl.toFixed(2)),
          winRate: current.signals > 0 ? Math.round((current.wins / (current.wins + current.losses)) * 100) || 0 : 0,
          signals: current.signals
        };
      }
      return best;
    }, null);

    // Find highest single trade this week
    const closedSignals = weeklySignals.filter(s => s.status === 'closed' && s.pnl_pct !== null);
    const highestTrade = closedSignals.reduce((best: any, current: any) => {
      if (!best || current.pnl_pct > best.pnl_pct) {
        return {
          provider: current.providers.name,
          token: current.token,
          pnlPct: parseFloat(current.pnl_pct.toFixed(2)),
          action: current.action
        };
      }
      return best;
    }, null);

    // Find most active trader this week
    const mostActive = Object.values(providerStats).reduce((best: any, current: any) => {
      if (!best || current.signals > best.signals) {
        return {
          name: current.name,
          address: current.address,
          signals: current.signals
        };
      }
      return best;
    }, null);

    // Calculate platform stats
    const activeProviders = new Set(weeklySignals.map(s => s.provider)).size;
    const totalSignals = weeklySignals.length;
    
    // Calculate total PnL and win rate across all providers
    let allTimeSignalsData: any[];
    
    if (!hasSupabaseConfig || isDev) {
      allTimeSignalsData = mockSignals.filter(s => s.status === 'closed' && s.pnl_pct != null);
    } else {
      const allTimeSignals = await supabase
        .from('signals')
        .select('pnl_pct, pnl_usd, status')
        .eq('status', 'closed')
        .not('pnl_pct', 'is', null);
      
      allTimeSignalsData = allTimeSignals.data || [];
    }

    const totalPnlUsd = allTimeSignalsData.reduce((sum, signal) => sum + (signal.pnl_usd || 0), 0) || 0;
    const totalWins = allTimeSignalsData.filter(s => s.pnl_pct > 0).length || 0;
    const totalTrades = allTimeSignalsData.length || 1;
    const avgWinRate = Math.round((totalWins / totalTrades) * 100) || 0;

    const response = {
      bestPerformer,
      highestTrade,
      mostActive,
      platformStats: {
        totalSignals,
        totalProviders: allProviders.length,
        activeProviders,
        totalPnl: Math.round(totalPnlUsd),
        avgWinRate
      },
      weekRange
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Weekly recap error:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly recap' },
      { status: 500 }
    );
  }
}