import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userAddress = request.headers.get('x-user-address');
    
    if (!userAddress) {
      return NextResponse.json({ 
        error: 'User address required' 
      }, { status: 400 });
    }

    const userId = userAddress.toLowerCase();

    // Get user's followed providers
    const { data: portfolio, error: portfolioError } = await supabase
      .from('user_portfolios')
      .select('followed_providers')
      .eq('user_id', userId)
      .single();

    if (portfolioError || !portfolio?.followed_providers || portfolio.followed_providers.length === 0) {
      return NextResponse.json({ 
        providers: [],
        message: 'No followed providers found'
      });
    }

    const followedAddresses = portfolio.followed_providers;

    // Get provider details and stats
    const { data: providers, error: providersError } = await supabase
      .from('signal_providers')
      .select(`
        address,
        name,
        bio,
        avatar,
        followers,
        updated_at
      `)
      .in('address', followedAddresses);

    if (providersError) {
      console.error('Error fetching providers:', providersError);
      return NextResponse.json({ 
        error: 'Failed to fetch provider details' 
      }, { status: 500 });
    }

    // Get aggregated stats for each provider
    const providerStats = await Promise.all(
      (providers || []).map(async (provider) => {
        try {
          // Get signal stats
          const { data: signalStats } = await supabase
            .from('signals')
            .select(`
              id,
              action,
              token,
              timestamp,
              status,
              pnl_pct,
              reasoning
            `)
            .eq('provider', provider.address)
            .order('timestamp', { ascending: false });

          const totalSignals = signalStats?.length || 0;
          const closedSignals = signalStats?.filter(s => s.status === 'closed') || [];
          const winningSignals = closedSignals.filter(s => (s.pnl_pct || 0) > 0);
          
          const winRate = closedSignals.length > 0 
            ? Math.round((winningSignals.length / closedSignals.length) * 100) 
            : 0;
          
          const avgPnl = closedSignals.length > 0
            ? closedSignals.reduce((sum, signal) => sum + (signal.pnl_pct || 0), 0) / closedSignals.length
            : 0;

          // Get latest signal
          const latestSignal = signalStats && signalStats.length > 0 ? signalStats[0] : null;
          const lastSignalAt = latestSignal ? latestSignal.timestamp : null;

          return {
            ...provider,
            signal_count: totalSignals,
            win_rate: winRate,
            pnl_pct: avgPnl,
            last_signal_at: lastSignalAt,
            latest_signal: latestSignal ? {
              action: latestSignal.action,
              token: latestSignal.token,
              timestamp: latestSignal.timestamp,
              reasoning: latestSignal.reasoning
            } : null
          };
        } catch (error) {
          console.error(`Error fetching stats for provider ${provider.address}:`, error);
          return {
            ...provider,
            signal_count: 0,
            win_rate: 0,
            pnl_pct: 0,
            last_signal_at: null,
            latest_signal: null
          };
        }
      })
    );

    // Sort by most recent activity
    const sortedProviders = providerStats.sort((a, b) => {
      if (!a.last_signal_at && !b.last_signal_at) return 0;
      if (!a.last_signal_at) return 1;
      if (!b.last_signal_at) return -1;
      return new Date(b.last_signal_at).getTime() - new Date(a.last_signal_at).getTime();
    });

    return NextResponse.json({ 
      providers: sortedProviders,
      total: sortedProviders.length
    });

  } catch (error) {
    console.error('Following API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch followed providers' 
    }, { status: 500 });
  }
}