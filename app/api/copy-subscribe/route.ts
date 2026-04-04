import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, providerAddress, telegramUsername, webhook, positionSize } = body;

    if (!email || !providerAddress) {
      return NextResponse.json(
        { error: 'Email and provider address are required' },
        { status: 400 }
      );
    }

    // Validate position size
    if (positionSize && (positionSize < 1 || positionSize > 50)) {
      return NextResponse.json(
        { error: 'Position size must be between 1% and 50%' },
        { status: 400 }
      );
    }

    // Check if provider exists
    const { data: providerExists } = await supabase
      .from('providers')
      .select('address')
      .ilike('address', providerAddress)
      .single();

    if (!providerExists) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Check if already subscribed
    const { data: existingSubscription } = await supabase
      .from('copy_subscriptions')
      .select('id')
      .ilike('email', email)
      .ilike('provider_address', providerAddress)
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Already subscribed to this provider' },
        { status: 409 }
      );
    }

    // Create subscription
    const { error: insertError } = await supabase
      .from('copy_subscriptions')
      .insert({
        email, 
        provider_address: providerAddress, 
        telegram_username: telegramUsername || null, 
        webhook_url: webhook || null, 
        position_size_pct: positionSize || 10,
        created_at: new Date().toISOString(),
        status: 'active'
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully subscribed to copy trading signals'
    });

  } catch (error) {
    console.error('Copy subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    // Get user's subscriptions with provider details
    const { data: subscriptions } = await supabase
      .from('copy_subscriptions')
      .select(`
        *,
        providers!inner (
          name,
          twitter,
          total_pnl,
          win_rate
        )
      `)
      .ilike('email', email)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    return NextResponse.json({ 
      subscriptions: subscriptions || []
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, providerAddress } = body;

    if (!email || !providerAddress) {
      return NextResponse.json(
        { error: 'Email and provider address are required' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('copy_subscriptions')
      .update({ 
        status: 'cancelled', 
        updated_at: new Date().toISOString() 
      })
      .ilike('email', email)
      .ilike('provider_address', providerAddress);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}