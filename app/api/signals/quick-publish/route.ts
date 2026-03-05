import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

interface QuickSignalRequest {
  action: 'LONG' | 'SHORT';
  token: string;
  entryPrice: number;
  leverage: number;
  reasoning: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuickSignalRequest = await request.json();
    
    // Validate required fields
    if (!body.action || !body.token || !body.entryPrice || !body.reasoning) {
      return NextResponse.json(
        { error: 'Missing required fields: action, token, entryPrice, reasoning' },
        { status: 400 }
      );
    }

    // Validate confidence range
    if (body.confidence < 0.1 || body.confidence > 1) {
      return NextResponse.json(
        { error: 'Confidence must be between 0.1 and 1.0' },
        { status: 400 }
      );
    }

    // For quick publish, we'll use a demo provider account
    // In a real implementation, you'd use session auth to get the actual provider
    const demoProviderId = 'demo-provider';
    
    // Calculate collateral based on entry price and leverage
    // Assuming $100 base position size for demo
    const basePositionSize = 100;
    const collateralUsd = basePositionSize / body.leverage;

    // Create the signal record
    const signalData = {
      provider_id: demoProviderId,
      action: body.action,
      token: body.token.toUpperCase(),
      entry_price: body.entryPrice,
      leverage: body.leverage,
      collateral_usd: collateralUsd,
      confidence: body.confidence,
      reasoning: body.reasoning,
      signal_type: 'DEMO',
      status: 'OPEN',
      created_at: new Date().toISOString(),
      expires_at: null, // No expiration for demo signals
      tx_hash: null, // No transaction for quick publish
      // Position tracking
      position_id: `demo_${Date.now()}`,
      target_price: null,
      stop_loss: null,
      current_pnl_usd: 0,
      current_pnl_pct: 0,
      is_closed: false,
      closed_at: null,
      close_reason: null,
      close_price: null
    };

    // Check if demo provider exists, create if not
    const { data: existingProvider, error: providerCheckError } = await supabase
      .from('signal_providers')
      .select('address')
      .eq('address', demoProviderId)
      .single();

    if (providerCheckError && providerCheckError.code === 'PGRST116') {
      // Provider doesn't exist, create demo provider
      const { error: createProviderError } = await supabase
        .from('signal_providers')
        .insert({
          address: demoProviderId,
          name: 'Quick Publish Demo',
          bio: 'Demo provider for quick signal publishing',
          registered_at: new Date().toISOString(),
          total_signals: 0
        });

      if (createProviderError) {
        console.error('Error creating demo provider:', createProviderError);
        return NextResponse.json(
          { error: 'Failed to initialize demo provider' },
          { status: 500 }
        );
      }
    }

    // Insert the signal
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .insert([signalData])
      .select()
      .single();

    if (signalError) {
      console.error('Error creating quick signal:', signalError);
      return NextResponse.json(
        { error: 'Failed to publish signal' },
        { status: 500 }
      );
    }

    // Update provider's signal count
    const { error: updateProviderError } = await supabase
      .from('signal_providers')
      .update({ 
        total_signals: supabase.raw('total_signals + 1'),
        last_signal_at: new Date().toISOString()
      })
      .eq('address', demoProviderId);

    if (updateProviderError) {
      console.error('Error updating provider stats:', updateProviderError);
      // Don't fail the request for this
    }

    // Log the quick publish event
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'quick_signal_published',
      signal_id: signal.id,
      data: {
        action: body.action,
        token: body.token,
        entry_price: body.entryPrice,
        leverage: body.leverage,
        confidence: body.confidence,
        reasoning_length: body.reasoning.length
      }
    };

    console.log('📈 Quick signal published:', logEntry);

    return NextResponse.json({
      success: true,
      signal: {
        id: signal.id,
        action: signal.action,
        token: signal.token,
        entry_price: signal.entry_price,
        leverage: signal.leverage,
        confidence: signal.confidence,
        reasoning: signal.reasoning,
        created_at: signal.created_at
      },
      message: 'Signal published successfully! Ready to publish more?'
    });

  } catch (error) {
    console.error('Error in quick-publish API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to show quick publish stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';

    let timeFilter = new Date();
    switch (period) {
      case '1h':
        timeFilter.setHours(timeFilter.getHours() - 1);
        break;
      case '24h':
        timeFilter.setHours(timeFilter.getHours() - 24);
        break;
      case '7d':
        timeFilter.setDate(timeFilter.getDate() - 7);
        break;
      default:
        timeFilter.setHours(timeFilter.getHours() - 24);
    }

    const { data: quickSignals, error } = await supabase
      .from('signals')
      .select('id, action, token, entry_price, leverage, confidence, created_at')
      .eq('signal_type', 'DEMO')
      .gte('created_at', timeFilter.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quick signals:', error);
      return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }

    const stats = {
      total_quick_signals: quickSignals?.length || 0,
      most_popular_token: quickSignals?.length > 0 
        ? quickSignals
            .reduce((acc, signal) => {
              acc[signal.token] = (acc[signal.token] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
        : {},
      avg_confidence: quickSignals?.length > 0
        ? quickSignals.reduce((sum, signal) => sum + signal.confidence, 0) / quickSignals.length
        : 0,
      long_short_ratio: quickSignals?.length > 0
        ? {
            long: quickSignals.filter(s => s.action === 'LONG').length,
            short: quickSignals.filter(s => s.action === 'SHORT').length
          }
        : { long: 0, short: 0 }
    };

    return NextResponse.json({
      period,
      stats,
      recent_signals: quickSignals?.slice(0, 10) || []
    });

  } catch (error) {
    console.error('Error in quick-publish stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}