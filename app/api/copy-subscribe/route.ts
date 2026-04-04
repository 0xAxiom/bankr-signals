import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/db';

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
    const providerExists = await dbQuery(
      'SELECT address FROM providers WHERE LOWER(address) = LOWER(?)',
      [providerAddress]
    );

    if (!providerExists || providerExists.length === 0) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Check if already subscribed
    const existingSubscription = await dbQuery(
      'SELECT id FROM copy_subscriptions WHERE LOWER(email) = LOWER(?) AND LOWER(provider_address) = LOWER(?)',
      [email, providerAddress]
    );

    if (existingSubscription && existingSubscription.length > 0) {
      return NextResponse.json(
        { error: 'Already subscribed to this provider' },
        { status: 409 }
      );
    }

    // Create subscription
    await dbExecute(`
      INSERT INTO copy_subscriptions (
        email, 
        provider_address, 
        telegram_username, 
        webhook_url, 
        position_size_pct,
        created_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      email, 
      providerAddress, 
      telegramUsername || null, 
      webhook || null, 
      positionSize || 10,
      new Date().toISOString(),
      'active'
    ]);

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
    const subscriptions = await dbQuery(`
      SELECT 
        cs.*,
        p.name as provider_name,
        p.twitter as provider_twitter,
        p.total_pnl,
        p.win_rate
      FROM copy_subscriptions cs
      JOIN providers p ON LOWER(cs.provider_address) = LOWER(p.address)
      WHERE LOWER(cs.email) = LOWER(?)
      AND cs.status = 'active'
      ORDER BY cs.created_at DESC
    `, [email]);

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

    const result = await dbExecute(`
      UPDATE copy_subscriptions 
      SET status = 'cancelled', updated_at = ?
      WHERE LOWER(email) = LOWER(?) AND LOWER(provider_address) = LOWER(?)
    `, [new Date().toISOString(), email, providerAddress]);

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