import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get signals from the last week
    const { data: weeklySignals, error: signalsError } = await supabase
      .from('signals')
      .select(`
        *,
        providers (name, twitter, avatar)
      `)
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: false });

    if (signalsError) {
      console.error('Error fetching weekly signals:', signalsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Get all providers for comparison
    const { data: allProviders, error: providersError } = await supabase
      .from('providers')
      .select('*');

    if (providersError) {
      console.error('Error fetching providers:', providersError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const signals = weeklySignals || [];
    const providers = allProviders || [];

    // Calculate weekly stats
    const totalSignalsThisWeek = signals.length;
    const openSignalsThisWeek = signals.filter(s => s.status === 'open').length;
    const closedSignalsThisWeek = signals.filter(s => s.status === 'closed').length;

    // Active providers this week
    const activeProvidersThisWeek = providers.filter(p => {
      return signals.some(s => s.provider_address === p.address);
    });

    // Best performing signal this week
    const closedSignals = signals.filter(s => s.status === 'closed' && s.pnl_pct !== null);
    const bestSignal = closedSignals.length > 0 
      ? closedSignals.reduce((best, current) => 
          (current.pnl_pct || 0) > (best.pnl_pct || 0) ? current : best
        )
      : null;

    // Calculate average PnL for closed trades this week
    const avgPnL = closedSignals.length > 0
      ? closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / closedSignals.length
      : 0;

    // Most active provider this week
    const providerActivity = activeProvidersThisWeek.map(p => {
      const providerSignals = signals.filter(s => s.provider_address === p.address);
      return {
        provider: p,
        signalCount: providerSignals.length,
        winRate: providerSignals.length > 0 
          ? (providerSignals.filter(s => s.status === 'closed' && (s.pnl_pct || 0) > 0).length / 
             providerSignals.filter(s => s.status === 'closed').length) * 100
          : 0
      };
    }).filter(p => p.signalCount > 0);

    const mostActiveProvider = providerActivity.length > 0
      ? providerActivity.reduce((most, current) => 
          current.signalCount > most.signalCount ? current : most
        )
      : null;

    // Top assets traded this week
    const assetCounts = signals.reduce((acc, signal) => {
      const asset = signal.token || signal.asset || 'Unknown';
      acc[asset] = (acc[asset] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topAssets = Object.entries(assetCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([asset, count]) => ({ asset, count }));

    const pulse = {
      week: {
        start: oneWeekAgo,
        end: new Date().toISOString()
      },
      summary: {
        totalSignals: totalSignalsThisWeek,
        openSignals: openSignalsThisWeek,
        closedSignals: closedSignalsThisWeek,
        activeProviders: activeProvidersThisWeek.length,
        avgPnL: Math.round(avgPnL * 100) / 100
      },
      highlights: {
        bestSignal: bestSignal ? {
          id: bestSignal.id,
          provider: bestSignal.providers?.name,
          asset: bestSignal.token || bestSignal.asset,
          action: bestSignal.action,
          pnl: bestSignal.pnl_pct,
          reasoning: bestSignal.reasoning
        } : null,
        mostActiveProvider: mostActiveProvider ? {
          name: mostActiveProvider.provider.name,
          signalCount: mostActiveProvider.signalCount,
          winRate: Math.round(mostActiveProvider.winRate)
        } : null,
        topAssets
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(pulse);

  } catch (error) {
    console.error('Error in weekly-pulse API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}