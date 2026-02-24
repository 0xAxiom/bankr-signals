import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get recent signals from Supabase (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .gte('timestamp', weekAgo)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (error || !signals || signals.length === 0) {
      return NextResponse.json({ signal: null, provider: null });
    }

    // Score each signal
    const scoredSignals = signals.map(signal => {
      let score = 0;
      
      const hoursAgo = (Date.now() - new Date(signal.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 24) score += 10;
      else if (hoursAgo < 72) score += 5;
      
      if (signal.status === 'closed' && signal.pnl_pct && signal.pnl_pct > 0) {
        score += signal.pnl_pct * 0.5;
      }
      
      if (signal.status === 'open' && signal.reasoning) {
        score += 3;
      }
      
      if (signal.leverage >= 10) score += 2;
      else if (signal.leverage >= 5) score += 1;
      
      if (signal.confidence && signal.confidence >= 0.8) score += 2;
      
      // Small random factor
      score += Math.random() * 2;
      
      return { signal, score };
    });

    scoredSignals.sort((a, b) => b.score - a.score);
    const best = scoredSignals[0].signal;

    // Get provider info
    const { data: providerData } = await supabase
      .from('signal_providers')
      .select('*')
      .ilike('address', best.provider)
      .maybeSingle();

    if (!providerData) {
      return NextResponse.json({ signal: null, provider: null });
    }

    // Map DB column names to API format
    const signalResponse = {
      id: best.id,
      provider: best.provider,
      timestamp: best.timestamp,
      action: best.action,
      token: best.token,
      chain: best.chain,
      entryPrice: best.entry_price,
      leverage: best.leverage,
      collateralUsd: best.collateral_usd,
      txHash: best.tx_hash,
      status: best.status,
      stopLossPct: best.stop_loss_pct,
      takeProfitPct: best.take_profit_pct,
      reasoning: best.reasoning,
      confidence: best.confidence,
      pnlPct: best.pnl_pct,
      score: scoredSignals[0].score,
    };

    const providerResponse = {
      address: providerData.address,
      name: providerData.name,
      bio: providerData.bio,
      description: providerData.description,
      registeredAt: providerData.registered_at,
      chain: providerData.chain,
      agent: providerData.agent,
      twitter: providerData.twitter,
      farcaster: providerData.farcaster,
      github: providerData.github,
      website: providerData.website,
      avatar: providerData.avatar,
    };

    return NextResponse.json({
      signal: signalResponse,
      provider: providerResponse,
    });

  } catch (error) {
    console.error('Signal of day error:', error);
    return NextResponse.json(
      { error: 'Failed to load signal of day' },
      { status: 500 }
    );
  }
}
