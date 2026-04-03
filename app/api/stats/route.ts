import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    // Get provider stats
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*');

    if (providersError) {
      console.error('Error fetching providers:', providersError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Get signals stats
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*');

    if (signalsError) {
      console.error('Error fetching signals:', signalsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const activeProviders = providers?.filter(p => {
      const providerSignals = signals?.filter(s => s.provider_address === p.address) || [];
      return providerSignals.length > 0;
    }) || [];

    const totalSignals = signals?.length || 0;
    const openSignals = signals?.filter(s => s.status === 'open').length || 0;
    const closedSignals = signals?.filter(s => s.status === 'closed').length || 0;

    // Calculate aggregate stats
    const totalProviders = providers?.length || 0;
    const totalSubscribers = providers?.reduce((sum, p) => sum + (p.subscriber_count || 0), 0) || 0;

    // Calculate win rate for providers with closed trades
    const providersWithClosedTrades = activeProviders.filter(p => {
      const providerSignals = signals?.filter(s => s.provider_address === p.address && s.status === 'closed') || [];
      return providerSignals.length > 0;
    });

    const avgWinRate = providersWithClosedTrades.length > 0
      ? providersWithClosedTrades.reduce((sum, p) => {
          const providerSignals = signals?.filter(s => s.provider_address === p.address && s.status === 'closed') || [];
          const winningTrades = providerSignals.filter(s => (s.pnl_pct || 0) > 0);
          const winRate = providerSignals.length > 0 ? (winningTrades.length / providerSignals.length) * 100 : 0;
          return sum + winRate;
        }, 0) / providersWithClosedTrades.length
      : 0;

    // Calculate total volume
    const totalVolume = signals?.reduce((sum, s) => sum + (s.collateral_usd || 0), 0) || 0;

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