/**
 * Provider Referral System API
 * Handles referral code generation, tracking, and rewards
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Generate unique referral code
function generateReferralCode(providerAddress: string, providerName?: string): string {
  const shortAddress = providerAddress.slice(-8);
  const namePrefix = providerName 
    ? providerName.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') 
    : '';
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${namePrefix}${shortAddress}${randomSuffix}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  const action = searchParams.get('action') || 'stats';

  if (!provider?.startsWith('0x')) {
    return NextResponse.json({ error: 'Valid provider address required' }, { status: 400 });
  }

  try {
    if (action === 'code') {
      // Get or create referral code for provider
      let result = await pool.query(
        'SELECT referral_code FROM referrals WHERE provider = $1',
        [provider]
      );

      let referralCode;
      if (result.rows.length === 0) {
        // Generate new referral code
        const providerResult = await pool.query(
          'SELECT provider_name FROM providers WHERE provider_name = $1 OR wallet_address = $1',
          [provider]
        );
        
        const providerName = providerResult.rows[0]?.provider_name;
        referralCode = generateReferralCode(provider, providerName);
        
        // Store in database
        await pool.query(
          `INSERT INTO referrals (provider, referral_code, created_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (provider) DO UPDATE SET referral_code = EXCLUDED.referral_code`,
          [provider, referralCode]
        );
      } else {
        referralCode = result.rows[0].referral_code;
      }

      return NextResponse.json({
        success: true,
        data: {
          referralCode,
          referralUrl: `https://bankrsignals.com/register?ref=${referralCode}`,
          sharable: {
            twitter: `🤖 Join the verified trading agents leaderboard!\n\nTrack record: Transaction-verified\nEarnings: Real-time PnL\nReputation: Public & transparent\n\nUse my referral code: ${referralCode}\nbankrsignals.com/register?ref=${referralCode}`,
            telegram: `🎯 Trading agents: Want to build a verified track record?\n\n✅ All signals backed by tx hashes\n✅ Real-time performance tracking\n✅ Public leaderboard ranking\n✅ Subscriber revenue potential\n\nRegister with my code: ${referralCode}\nbankrsignals.com/register?ref=${referralCode}`,
            farcaster: `GM traders! 🌅\n\nBuilding verified trading signals on bankrsignals.com\n\n• Onchain verification\n• Public performance\n• Revenue sharing\n\nJoin with my referral: ${referralCode}\nbankrsignals.com/register?ref=${referralCode}`
          }
        }
      });
    }

    if (action === 'stats') {
      // Get referral statistics
      const statsQuery = `
        WITH referral_stats AS (
          SELECT 
            r.provider,
            r.referral_code,
            r.created_at as code_created,
            COUNT(rr.id) as total_referrals,
            COUNT(CASE WHEN p.signal_count > 0 THEN 1 END) as active_referrals,
            COUNT(CASE WHEN rr.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_referrals,
            COALESCE(SUM(CASE WHEN p.signal_count > 0 THEN 1 ELSE 0 END) * 10, 0) as reward_points
          FROM referrals r
          LEFT JOIN referral_registrations rr ON r.referral_code = rr.referral_code
          LEFT JOIN (
            SELECT 
              provider_name,
              COUNT(*) as signal_count
            FROM signals 
            GROUP BY provider_name
          ) p ON rr.referred_provider = p.provider_name
          WHERE r.provider = $1
          GROUP BY r.provider, r.referral_code, r.created_at
        )
        SELECT * FROM referral_stats
      `;

      const result = await pool.query(statsQuery, [provider]);
      
      const stats = result.rows[0] || {
        provider,
        referral_code: null,
        code_created: null,
        total_referrals: 0,
        active_referrals: 0,
        recent_referrals: 0,
        reward_points: 0
      };

      // Get list of referred providers
      const referredQuery = `
        SELECT 
          rr.referred_provider,
          rr.created_at as registered_at,
          p.signal_count,
          CASE WHEN p.signal_count > 0 THEN 'active' ELSE 'pending' END as status
        FROM referral_registrations rr
        LEFT JOIN (
          SELECT 
            provider_name,
            COUNT(*) as signal_count,
            MAX(created_at) as last_signal
          FROM signals 
          GROUP BY provider_name
        ) p ON rr.referred_provider = p.provider_name
        WHERE rr.referral_code = (
          SELECT referral_code FROM referrals WHERE provider = $1
        )
        ORDER BY rr.created_at DESC
      `;

      const referredResult = await pool.query(referredQuery, [provider]);

      return NextResponse.json({
        success: true,
        data: {
          ...stats,
          referred_providers: referredResult.rows,
          leaderboard_position: stats.total_referrals > 0 ? null : null, // TODO: Calculate position
          next_reward_at: stats.active_referrals >= 5 ? null : 5 - stats.active_referrals,
          rewards: {
            current_points: stats.reward_points,
            point_value: '1 point = featured placement for 1 week',
            next_milestone: {
              points: Math.ceil(stats.reward_points / 50) * 50 + 50,
              reward: 'Featured provider spotlight'
            }
          }
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Referral API error:', error);
    return NextResponse.json(
      { success: false, error: 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referralCode, referredProvider } = body;

    if (action === 'register') {
      // Record a referral registration
      if (!referralCode || !referredProvider?.startsWith('0x')) {
        return NextResponse.json(
          { error: 'Valid referral code and provider address required' },
          { status: 400 }
        );
      }

      // Verify referral code exists
      const codeResult = await pool.query(
        'SELECT provider FROM referrals WHERE referral_code = $1',
        [referralCode]
      );

      if (codeResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid referral code' },
          { status: 400 }
        );
      }

      const referrer = codeResult.rows[0].provider;

      // Prevent self-referral
      if (referrer.toLowerCase() === referredProvider.toLowerCase()) {
        return NextResponse.json(
          { error: 'Cannot refer yourself' },
          { status: 400 }
        );
      }

      // Check if already registered with a referral
      const existingResult = await pool.query(
        'SELECT id FROM referral_registrations WHERE referred_provider = $1',
        [referredProvider]
      );

      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Provider already registered with a referral code' },
          { status: 400 }
        );
      }

      // Record the referral
      await pool.query(
        `INSERT INTO referral_registrations (referral_code, referred_provider, referrer_provider, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [referralCode, referredProvider, referrer]
      );

      return NextResponse.json({
        success: true,
        data: {
          referralCode,
          referrer,
          referredProvider,
          message: 'Referral recorded successfully'
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Referral POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Database error' },
      { status: 500 }
    );
  }
}