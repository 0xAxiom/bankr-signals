import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { Resend } from 'resend';

interface WeeklySignal {
  id: string;
  providerName: string;
  providerAddress: string;
  action: string;
  token: string;
  entryPrice: number;
  leverage: number;
  pnl: number;
  collateralUsd: number;
  reasoning: string;
  timestamp: string;
  status: string;
  txHash?: string;
}

function generateEmailHTML(topSignals: WeeklySignal[], weekStart: string, weekEnd: string): string {
  const totalPnl = topSignals.reduce((sum, signal) => {
    return sum + (signal.collateralUsd * (signal.pnl / 100));
  }, 0);

  const avgPnl = topSignals.length > 0 ? (topSignals.reduce((sum, signal) => sum + signal.pnl, 0) / topSignals.length) : 0;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Weekly Bankr Signals Digest</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
            line-height: 1.6;
            color: #e5e5e5;
            background-color: #0a0a0a;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #111111;
            border: 1px solid #2a2a2a;
        }
        .header {
            text-align: center;
            border-bottom: 1px solid #2a2a2a;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #22c55e;
            margin-bottom: 10px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            background-color: #1a1a1a;
            border: 1px solid #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #22c55e;
        }
        .stat-label {
            font-size: 14px;
            color: #737373;
        }
        .signal {
            background-color: #1a1a1a;
            border: 1px solid #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #22c55e;
        }
        .signal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .action-badge {
            background-color: rgba(34, 197, 94, 0.1);
            color: rgba(34, 197, 94, 0.8);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .pnl {
            font-weight: bold;
            color: #22c55e;
        }
        .token {
            font-size: 20px;
            font-weight: bold;
            margin: 10px 0;
        }
        .provider {
            color: #737373;
            font-size: 14px;
        }
        .reasoning {
            background-color: #111111;
            border: 1px solid #2a2a2a;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            font-style: italic;
            color: #b0b0b0;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #2a2a2a;
            color: #737373;
        }
        .button {
            display: inline-block;
            background-color: #22c55e;
            color: #000000;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 10px;
        }
        @media (max-width: 600px) {
            .stats {
                flex-direction: column;
                gap: 15px;
            }
            .signal-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📊 Bankr Signals</div>
            <h1>Weekly Top Signals Digest</h1>
            <p style="color: #737373;">${weekStart} - ${weekEnd}</p>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-value">${topSignals.length}</div>
                <div class="stat-label">Top Signals</div>
            </div>
            <div class="stat">
                <div class="stat-value">${avgPnl >= 0 ? '+' : ''}${avgPnl.toFixed(1)}%</div>
                <div class="stat-label">Avg PnL</div>
            </div>
            <div class="stat">
                <div class="stat-value">${totalPnl >= 0 ? '+$' : '-$'}${Math.abs(totalPnl).toFixed(0)}</div>
                <div class="stat-label">Total Dollar PnL</div>
            </div>
        </div>

        ${topSignals.map(signal => {
          const dollarPnl = signal.collateralUsd * (signal.pnl / 100);
          return `
            <div class="signal">
                <div class="signal-header">
                    <div>
                        <span class="action-badge">${signal.action}</span>
                        ${signal.leverage > 1 ? `<span style="background-color: rgba(234, 179, 8, 0.1); color: rgba(234, 179, 8, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">${signal.leverage}x</span>` : ''}
                    </div>
                    <div class="pnl">${signal.pnl >= 0 ? '+' : ''}${signal.pnl.toFixed(1)}% (${dollarPnl >= 0 ? '+$' : '-$'}${Math.abs(dollarPnl).toFixed(0)})</div>
                </div>
                
                <div class="token">$${signal.token}</div>
                <div class="provider">by ${signal.providerName} • $${signal.entryPrice.toFixed(4)} entry • ${signal.status.toUpperCase()}</div>
                
                ${signal.reasoning ? `
                    <div class="reasoning">
                        "${signal.reasoning.length > 150 ? signal.reasoning.slice(0, 150) + '...' : signal.reasoning}"
                    </div>
                ` : ''}
                
                ${signal.txHash ? `<div style="color: rgba(34, 197, 94, 0.6); font-size: 12px; margin-top: 10px;">✅ Verified on-chain</div>` : ''}
            </div>
          `;
        }).join('')}

        <div class="footer">
            <div>
                <a href="https://bankrsignals.com" class="button">View All Signals</a>
                <a href="https://bankrsignals.com/leaderboard" class="button">Leaderboard</a>
            </div>
            <p>Get verified trading signals from top onchain agents.</p>
            <p><small>This email was sent to you because you subscribed to Bankr Signals weekly digests.</small></p>
            <p><small><a href="https://bankrsignals.com/unsubscribe" style="color: #737373;">Unsubscribe</a></small></p>
        </div>
    </div>
</body>
</html>
  `;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get('preview') === 'true';
    const cronSecret = searchParams.get('secret');
    
    // Verify cron secret for automated sends
    if (!preview && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range for past week
    const weekEnd = new Date();
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Query top performing signals from the past week
    const { data: result, error } = await supabase
      .from('trades')
      .select(`
        id,
        action,
        token,
        entry_price,
        leverage,
        pnl_percentage,
        collateral_usd,
        reasoning,
        timestamp,
        status,
        tx_hash,
        providers!inner(name, address)
      `)
      .gte('timestamp', weekStart.toISOString())
      .lte('timestamp', weekEnd.toISOString())
      .not('pnl_percentage', 'is', null)
      .in('status', ['closed', 'stopped'])
      .order('pnl_percentage', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }
    const topSignals: WeeklySignal[] = (result || []).map((row: any) => ({
      id: row.id,
      providerName: row.providers.name,
      providerAddress: row.providers.address,
      action: row.action,
      token: row.token,
      entryPrice: row.entry_price,
      leverage: row.leverage || 1,
      pnl: row.pnl_percentage,
      collateralUsd: row.collateral_usd || 0,
      reasoning: row.reasoning || '',
      timestamp: row.timestamp,
      status: row.status,
      txHash: row.tx_hash
    }));

    if (topSignals.length === 0) {
      return NextResponse.json({ 
        message: 'No completed signals found for the past week',
        preview: preview ? generateEmailHTML([], weekStart.toDateString(), weekEnd.toDateString()) : undefined
      });
    }

    const emailHTML = generateEmailHTML(
      topSignals,
      weekStart.toDateString(),
      weekEnd.toDateString()
    );

    // If this is a preview, return the HTML
    if (preview) {
      return new Response(emailHTML, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, just return the data and HTML for testing
    return NextResponse.json({
      success: true,
      digest: {
        weekStart: weekStart.toDateString(),
        weekEnd: weekEnd.toDateString(),
        signalsCount: topSignals.length,
        avgPnl: topSignals.reduce((sum, s) => sum + s.pnl, 0) / topSignals.length,
        totalDollarPnl: topSignals.reduce((sum, s) => sum + (s.collateralUsd * (s.pnl / 100)), 0)
      },
      signals: topSignals.map(s => ({
        id: s.id,
        provider: s.providerName,
        action: s.action,
        token: s.token,
        pnl: s.pnl,
        dollarPnl: s.collateralUsd * (s.pnl / 100)
      })),
      html: emailHTML
    });

  } catch (error) {
    console.error('Email digest error:', error);
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emails, cronSecret } = body;
    
    // Verify cron secret
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'Invalid emails array' }, { status: 400 });
    }

    // Generate the digest data
    const digestResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email-digest?secret=${cronSecret}`);
    const digestData = await digestResponse.json();
    
    if (!digestData.success) {
      return NextResponse.json({ error: 'Failed to generate digest data' }, { status: 500 });
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return NextResponse.json({
        success: true,
        message: `Digest prepared for ${emails.length} recipients (emails not sent - no API key)`,
        digest: digestData.digest
      });
    }

    const results = [];
    const errors = [];
    
    // Send emails in batches of 10 to avoid rate limits
    for (let i = 0; i < emails.length; i += 10) {
      const batch = emails.slice(i, i + 10);
      
      for (const email of batch) {
        try {
          const result = await resend.emails.send({
            from: 'Bankr Signals <digest@bankrsignals.com>',
            to: email,
            subject: `📊 Top Trading Signals This Week - ${digestData.digest.weekStart}`,
            html: digestData.html,
            text: `Top Trading Signals This Week\n\nView the full digest at: ${process.env.NEXT_PUBLIC_BASE_URL}/weekly-digest\n\nUnsubscribe: ${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe`
          });
          
          results.push({ email, success: true, id: result.data?.id });
        } catch (error: any) {
          console.error(`Failed to send email to ${email}:`, error);
          errors.push({ email, error: error.message });
        }
      }
      
      // Small delay between batches
      if (i + 10 < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Digest sent to ${results.length}/${emails.length} recipients`,
      digest: digestData.digest,
      results: {
        sent: results.length,
        failed: errors.length,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Email digest send error:', error);
    return NextResponse.json({ error: 'Failed to send digest' }, { status: 500 });
  }
}