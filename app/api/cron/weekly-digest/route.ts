import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

interface WeeklyDigestData {
  topSignals: any[];
  topProviders: any[];
  weeklyStats: {
    totalSignals: number;
    winRate: number;
    totalVolume: number;
    activeProviders: number;
  };
  previousWeekStats?: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const execute = searchParams.get('execute') === 'true';
    const dryRun = searchParams.get('dry-run') === 'true';
    
    // Get weekly digest data
    const digestData = await generateWeeklyDigestData();
    
    if (execute && !dryRun) {
      // Send emails to subscribers
      const sendResult = await sendWeeklyDigestEmails(digestData);
      return createSuccessResponse({
        ...digestData,
        emailResults: sendResult,
        action: 'digest_sent'
      });
    } else {
      // Just return the data for preview
      return createSuccessResponse({
        ...digestData,
        action: dryRun ? 'dry_run' : 'preview'
      });
    }
    
  } catch (error: any) {
    console.error('Weekly digest error:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to generate weekly digest', 500);
  }
}

async function generateWeeklyDigestData(): Promise<WeeklyDigestData> {
  // Get date range for this week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysUntilMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Get previous week for comparison
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekEnd);
  prevWeekEnd.setDate(weekEnd.getDate() - 7);

  // Top performing signals this week (closed positions with good PnL)
  const { data: topSignals } = await supabase
    .from('signals')
    .select(`
      *,
      signal_providers(name, avatar, verified)
    `)
    .gte('timestamp', weekStart.toISOString())
    .lte('timestamp', weekEnd.toISOString())
    .eq('status', 'closed')
    .not('pnl_pct', 'is', null)
    .order('pnl_pct', { ascending: false })
    .limit(10);

  // Top providers by performance this week
  const { data: topProviders } = await supabase
    .from('signal_providers')
    .select(`
      address, name, avatar, verified, total_signals, win_rate, avg_roi, followers,
      signals!inner(pnl_pct, status, timestamp)
    `)
    .gte('signals.timestamp', weekStart.toISOString())
    .lte('signals.timestamp', weekEnd.toISOString())
    .eq('signals.status', 'closed')
    .limit(5)
    .order('avg_roi', { ascending: false });

  // Weekly stats
  const { data: weeklySignals } = await supabase
    .from('signals')
    .select('status, pnl_pct, collateral_usd')
    .gte('timestamp', weekStart.toISOString())
    .lte('timestamp', weekEnd.toISOString());

  const { count: activeProviders } = await supabase
    .from('signals')
    .select('provider_address', { count: 'exact', head: true })
    .gte('timestamp', weekStart.toISOString())
    .lte('timestamp', weekEnd.toISOString());

  // Calculate weekly stats
  const totalSignals = weeklySignals?.length || 0;
  const closedSignals = weeklySignals?.filter(s => s.status === 'closed') || [];
  const winningSignals = closedSignals.filter(s => s.pnl_pct && s.pnl_pct > 0);
  const winRate = closedSignals.length > 0 ? (winningSignals.length / closedSignals.length) * 100 : 0;
  const totalVolume = weeklySignals?.reduce((sum, s) => sum + (s.collateral_usd || 0), 0) || 0;

  // Previous week stats for comparison
  const { data: prevWeekSignals } = await supabase
    .from('signals')
    .select('status, pnl_pct, collateral_usd')
    .gte('timestamp', prevWeekStart.toISOString())
    .lte('timestamp', prevWeekEnd.toISOString());

  const prevClosedSignals = prevWeekSignals?.filter(s => s.status === 'closed') || [];
  const prevWinningSignals = prevClosedSignals.filter(s => s.pnl_pct && s.pnl_pct > 0);
  const prevWinRate = prevClosedSignals.length > 0 ? (prevWinningSignals.length / prevClosedSignals.length) * 100 : 0;

  return {
    topSignals: topSignals || [],
    topProviders: topProviders || [],
    weeklyStats: {
      totalSignals,
      winRate,
      totalVolume,
      activeProviders: activeProviders || 0,
    },
    previousWeekStats: {
      totalSignals: prevWeekSignals?.length || 0,
      winRate: prevWinRate,
      totalVolume: prevWeekSignals?.reduce((sum, s) => sum + (s.collateral_usd || 0), 0) || 0,
    }
  };
}

async function sendWeeklyDigestEmails(digestData: WeeklyDigestData) {
  // Get all active email subscribers who want weekly digest
  const { data: subscribers } = await supabase
    .from('email_subscribers')
    .select('email, name, unsubscribe_token')
    .eq('active', true)
    .eq('weekly_digest', true)
    .not('confirmed_at', 'is', null);

  if (!subscribers || subscribers.length === 0) {
    return {
      success: true,
      message: 'No active subscribers found',
      subscribers: 0,
      sent: 0
    };
  }

  console.log(`📧 Sending weekly digest to ${subscribers.length} subscribers`);

  // Generate email content
  const emailHTML = generateDigestEmailHTML(digestData);
  const emailText = generateDigestEmailText(digestData);
  
  let sentCount = 0;
  let errors: string[] = [];

  // Send emails (in production, you'd want to use a proper email service like SendGrid, Postmark, etc.)
  for (const subscriber of subscribers) {
    try {
      // For now, just log the email content
      console.log(`📧 Would send email to: ${subscriber.email}`);
      console.log(`Subject: 📊 Weekly Signals Digest - ${getWeekDateRange()}`);
      
      // In production, replace this with actual email sending:
      // await sendEmail({
      //   to: subscriber.email,
      //   subject: `📊 Weekly Signals Digest - ${getWeekDateRange()}`,
      //   html: emailHTML,
      //   text: emailText,
      //   unsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?token=${subscriber.unsubscribe_token}`
      // });

      // Update last_email_sent_at
      await supabase
        .from('email_subscribers')
        .update({ last_email_sent_at: new Date().toISOString() })
        .eq('email', subscriber.email);

      sentCount++;
      
    } catch (error: any) {
      console.error(`Failed to send email to ${subscriber.email}:`, error);
      errors.push(`${subscriber.email}: ${error.message}`);
    }
  }

  return {
    success: true,
    subscribers: subscribers.length,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
    digestData
  };
}

function getWeekDateRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysUntilMonday);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
}

function generateDigestEmailHTML(data: WeeklyDigestData): string {
  const { topSignals, topProviders, weeklyStats, previousWeekStats } = data;
  const weekRange = getWeekDateRange();
  
  const winRateChange = previousWeekStats 
    ? weeklyStats.winRate - previousWeekStats.winRate 
    : 0;
  
  const signalChange = previousWeekStats 
    ? weeklyStats.totalSignals - previousWeekStats.totalSignals 
    : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Weekly Signals Digest</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #0a0a0a; color: #e5e5e5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 30px 0; border-bottom: 1px solid #2a2a2a; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .section { margin: 30px 0; }
        .stats-grid { display: flex; gap: 15px; margin: 20px 0; }
        .stat-card { flex: 1; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 15px; text-align: center; }
        .stat-value { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .stat-label { font-size: 12px; color: #737373; }
        .signal-card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .provider-name { font-weight: bold; color: #e5e5e5; }
        .signal-action { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
        .long { background: rgba(34,197,94,0.1); color: #22c55e; }
        .short { background: rgba(239,68,68,0.1); color: #ef4444; }
        .pnl-positive { color: #22c55e; }
        .pnl-negative { color: #ef4444; }
        .footer { text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 30px; }
        .unsubscribe { font-size: 12px; color: #737373; }
        a { color: #3b82f6; text-decoration: none; }
        .change-positive { color: #22c55e; }
        .change-negative { color: #ef4444; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📊 Bankr Signals</div>
          <div style="color: #737373;">Weekly Digest • ${weekRange}</div>
        </div>

        <div class="section">
          <h2>📈 Week in Review</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${weeklyStats.totalSignals}</div>
              <div class="stat-label">Total Signals</div>
              ${signalChange !== 0 ? `<div class="change-${signalChange > 0 ? 'positive' : 'negative'}">${signalChange > 0 ? '+' : ''}${signalChange} vs last week</div>` : ''}
            </div>
            <div class="stat-card">
              <div class="stat-value">${weeklyStats.winRate.toFixed(1)}%</div>
              <div class="stat-label">Win Rate</div>
              ${winRateChange !== 0 ? `<div class="change-${winRateChange > 0 ? 'positive' : 'negative'}">${winRateChange > 0 ? '+' : ''}${winRateChange.toFixed(1)}% vs last week</div>` : ''}
            </div>
            <div class="stat-card">
              <div class="stat-value">${weeklyStats.activeProviders}</div>
              <div class="stat-label">Active Traders</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">$${(weeklyStats.totalVolume / 1000).toFixed(0)}K</div>
              <div class="stat-label">Total Volume</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🏆 Top Performing Signals</h2>
          ${topSignals.slice(0, 5).map(signal => `
            <div class="signal-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                  <span class="provider-name">${signal.signal_providers?.name || 'Unknown'}</span>
                  <span class="signal-action ${signal.action === 'LONG' || signal.action === 'BUY' ? 'long' : 'short'}">${signal.action}</span>
                  <span style="font-weight: bold; margin-left: 8px;">${signal.token}</span>
                </div>
                <div class="pnl-${signal.pnl_pct > 0 ? 'positive' : 'negative'}" style="font-weight: bold;">
                  ${signal.pnl_pct > 0 ? '+' : ''}${signal.pnl_pct.toFixed(1)}%
                </div>
              </div>
              ${signal.reasoning ? `<div style="font-size: 14px; color: #b0b0b0; background: #111; padding: 10px; border-radius: 6px;">"${signal.reasoning.substring(0, 150)}${signal.reasoning.length > 150 ? '...' : ''}"</div>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="section">
          <h2>⭐ Top Performers</h2>
          ${topProviders.slice(0, 3).map(provider => `
            <div class="signal-card">
              <div style="display: flex; justify-content: between; align-items: center;">
                <div>
                  <div class="provider-name">${provider.name}</div>
                  <div style="font-size: 12px; color: #737373;">
                    ${provider.total_signals} signals • ${provider.win_rate?.toFixed(1) || 0}% win rate • ${provider.followers || 0} followers
                  </div>
                </div>
                <div style="text-align: right;">
                  <div class="pnl-positive" style="font-weight: bold;">${provider.avg_roi?.toFixed(1) || 0}% avg ROI</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <a href="https://bankrsignals.com" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 20px;">
            View Full Platform →
          </a>
          <div class="unsubscribe">
            <a href="https://bankrsignals.com/unsubscribe?token={UNSUBSCRIBE_TOKEN}">Unsubscribe</a> • 
            <a href="https://bankrsignals.com">Visit Website</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateDigestEmailText(data: WeeklyDigestData): string {
  const { topSignals, topProviders, weeklyStats } = data;
  const weekRange = getWeekDateRange();
  
  let text = `📊 BANKR SIGNALS - WEEKLY DIGEST\n${weekRange}\n\n`;
  
  text += `📈 WEEK IN REVIEW\n`;
  text += `• ${weeklyStats.totalSignals} total signals\n`;
  text += `• ${weeklyStats.winRate.toFixed(1)}% win rate\n`;
  text += `• ${weeklyStats.activeProviders} active traders\n`;
  text += `• $${(weeklyStats.totalVolume / 1000).toFixed(0)}K total volume\n\n`;
  
  text += `🏆 TOP PERFORMING SIGNALS\n`;
  topSignals.slice(0, 5).forEach((signal, i) => {
    text += `${i + 1}. ${signal.signal_providers?.name || 'Unknown'}: ${signal.action} ${signal.token} → ${signal.pnl_pct > 0 ? '+' : ''}${signal.pnl_pct.toFixed(1)}%\n`;
  });
  
  text += `\n⭐ TOP PERFORMERS\n`;
  topProviders.slice(0, 3).forEach((provider, i) => {
    text += `${i + 1}. ${provider.name}: ${provider.avg_roi?.toFixed(1) || 0}% avg ROI (${provider.win_rate?.toFixed(1) || 0}% win rate)\n`;
  });
  
  text += `\n📊 View full platform: https://bankrsignals.com\n`;
  text += `🔗 Unsubscribe: https://bankrsignals.com/unsubscribe?token={UNSUBSCRIBE_TOKEN}`;
  
  return text;
}