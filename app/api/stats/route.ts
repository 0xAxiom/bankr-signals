import { NextResponse } from 'next/server';
import { dbGetProviders, dbGetSignals } from '@/lib/db';

export async function GET() {
  try {
    // Get provider stats using helper functions that handle fallbacks
    const providers = await dbGetProviders();
    const signals = await dbGetSignals(1000); // Get more signals for accurate stats

    // Defensive filtering - ensure we have valid data
    const validProviders = (providers || []).filter(p => p && p.address);
    const validSignals = (signals || []).filter(s => s && s.provider);

    const activeProviders = validProviders.filter(p => {
      const providerSignals = validSignals.filter(s => s.provider === p.address) || [];
      return providerSignals.length > 0;
    });

    const totalSignals = validSignals.length;
    const openSignals = validSignals.filter(s => s.status === 'open').length;
    const closedSignals = validSignals.filter(s => s.status === 'closed').length;

    // Calculate aggregate stats
    const totalProviders = validProviders.length;
    const totalSubscribers = validProviders.reduce((sum, p) => sum + (p.subscriber_count || 0), 0);

    // Calculate win rate for providers with closed trades
    const providersWithClosedTrades = activeProviders.filter(p => {
      const providerSignals = validSignals.filter(s => s.provider === p.address && s.status === 'closed');
      return providerSignals.length > 0;
    });

    const avgWinRate = providersWithClosedTrades.length > 0
      ? providersWithClosedTrades.reduce((sum, p) => {
          const providerSignals = validSignals.filter(s => s.provider === p.address && s.status === 'closed');
          const winningTrades = providerSignals.filter(s => (s.pnl_pct || 0) > 0);
          const winRate = providerSignals.length > 0 ? (winningTrades.length / providerSignals.length) * 100 : 0;
          return sum + winRate;
        }, 0) / providersWithClosedTrades.length
      : 0;

    // Calculate total volume
    const totalVolume = validSignals.reduce((sum, s) => sum + (s.collateral_usd || 0), 0);

    const stats = {
      providers: {
        total: totalProviders,
        active: activeProviders.length,
        inactive: totalProviders - activeProviders.length
      },
      signals: {
        total: totalSignals,
        open: openSignals,
        closed: closedSignals
      },
      performance: {
        avgWinRate: Math.round(avgWinRate),
        totalVolume: Math.round(totalVolume),
        totalSubscribers
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}