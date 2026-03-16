import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const signalId = params.id;

    // Query signal with provider information
    const { data, error } = await supabase
      .from('signals')
      .select(`
        *,
        providers!inner(name, address)
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
      timestamp: data.created_at,
      action: data.action,
      token: data.token,
      entryPrice: parseFloat(data.entry_price),
      leverage: data.leverage,
      txHash: data.tx_hash,
      exitTxHash: data.exit_tx_hash,
      pnl: data.pnl_percent ? parseFloat(data.pnl_percent) : null,
      status: data.status,
      collateralUsd: data.collateral_usd ? parseFloat(data.collateral_usd) : null,
      confidence: data.confidence ? parseFloat(data.confidence) : null,
      reasoning: data.reasoning,
      providerName: data.providers.name,
      providerAddress: data.providers.address,
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