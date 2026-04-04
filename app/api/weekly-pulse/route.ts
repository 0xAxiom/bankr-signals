import { NextResponse } from 'next/server';
import { dbGetSignals, dbGetProviders } from '@/lib/db';

export async function GET() {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get all signals and filter for the last week
    const allSignals = await dbGetSignals(1000);
    const signals = allSignals.filter(s => {
      const signalDate = new Date(s.timestamp || s.created_at);
      return signalDate >= oneWeekAgo;
    });

    // Get all providers
    const providers = await dbGetProviders();

    // Calculate weekly stats
    const totalSignalsThisWeek = signals.length;
    const openSignalsThisWeek = signals.filter(s => s.status === 'open').length;
    const closedSignalsThisWeek = signals.filter(s => s.status === 'closed').length;

    // Active providers this week
    const activeProvidersThisWeek = providers.filter(p => {
      return signals.some(s => s.provider === p.address);
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
      const providerSignals = signals.filter(s => s.provider === p.address);
      const closedProviderSignals = providerSignals.filter(s => s.status === 'closed');
      return {
        provider: p,
        signalCount: providerSignals.length,
        winRate: closedProviderSignals.length > 0 
          ? (providerSignals.filter(s => s.status === 'closed' && (s.pnl_pct || 0) > 0).length / 
             closedProviderSignals.length) * 100
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
      const asset = signal.token || 'Unknown';
      acc[asset] = (acc[asset] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topAssets = Object.entries(assetCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([asset, count]) => ({ asset, count }));

    const pulse = {
      week: {
        start: oneWeekAgo.toISOString(),
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
          provider: providers.find(p => p.address === bestSignal.provider)?.name || 'Unknown',
          asset: bestSignal.token,
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