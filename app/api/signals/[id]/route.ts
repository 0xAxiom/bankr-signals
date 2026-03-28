import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not configured' 
      }, { status: 503 });
    }

    const signalId = params.id;

    // Query signal with provider information
    const { data, error } = await supabase
      .from('signals')
      .select(`
        *,
        signal_providers!inner(name, address)
      `)
      .eq('id', signalId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Signal not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected format
    const signal = {
      id: data.id,
      timestamp: data.timestamp || data.created_at,
      action: data.action,
      token: data.token,
      entryPrice: parseFloat(data.entry_price),
      leverage: data.leverage,
      txHash: data.tx_hash,
      exitTxHash: data.exit_tx_hash,
      pnl: data.pnl_pct ? parseFloat(data.pnl_pct) : null,
      status: data.status,
      collateralUsd: data.collateral_usd ? parseFloat(data.collateral_usd) : null,
      confidence: data.confidence ? parseFloat(data.confidence) : null,
      reasoning: data.reasoning,
      providerName: data.signal_providers.name,
      providerAddress: data.signal_providers.address,
    };

    return NextResponse.json(signal, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching signal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}