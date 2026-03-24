/**
 * Weekly email digest cron job
 * Sends a curated summary of the best signals from the past week to subscribers
 * Should run weekly (e.g., Sundays at 9 AM PT)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, APIErrorCode } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface DigestSubscriber {
  email: string;
  name?: string;
  subscribed_at: string;
  unsubscribe_token: string;
  preferences?: {
    minPnL?: number;
    providers?: string[];
    frequency?: 'weekly' | 'daily';
  };
}

interface WeeklyDigestData {
  topSignals: any[];
  topProviders: any[];
  marketInsights: {
    totalSignals: number;
    avgPnL: number;
    winRate: number;
    topToken: string;
    sentiment: 'bullish' | 'bearish' | 'mixed';
  };
  newProviders: any[];
  streaks: any[];
}

async function getSubscribers(): Promise<DigestSubscriber[]> {
  try {
    const { data, error } = await supabase
      .from('email_subscribers')
      .select('email, name, created_at, unsubscribe_token')
      .eq('active', true)
      .eq('weekly_digest', true)
      .not('confirmed_at', 'is', null); // Only confirmed subscribers
    
    if (error) {
      console.error('Error fetching subscribers:', error);
      return [];
    }
    
    // Transform to match interface
    return (data || []).map(sub => ({
      email: sub.email,
      name: sub.name,
      subscribed_at: sub.created_at,
      unsubscribe_token: sub.unsubscribe_token,
      preferences: { frequency: 'weekly' as const }
    }));
  } catch (error) {
    console.error('Failed to get subscribers:', error);
    return [];
  }
}

async function generateWeeklyDigest(): Promise<WeeklyDigestData | null> {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get signals from the past week
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select(`
        *,
        signal_providers:provider (
          name,
          address,
          twitter,
          verified
        )
      `)
      .gte('timestamp', oneWeekAgo)
      .order('timestamp', { ascending: false });
    
    if (signalsError || !signals) {
      console.error('Error fetching signals:', signalsError);
      return null;
    }

    // Get providers for additional context
    const { data: providers, error: providersError } = await supabase
      .from('signal_providers')
      .select('*')
      .gte('registered_at', oneWeekAgo)
      .order('registered_at', { ascending: false });
    
    if (providersError) {
      console.error('Error fetching providers:', providersError);
    }

    // Process signals
    const closedSignals = signals.filter(s => s.status === 'closed' && s.pnl_pct !== null);
    const winningSignals = closedSignals.filter(s => s.pnl_pct > 0);
    
    // Top signals (by PnL)
    const topSignals = closedSignals
      .sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0))
      .slice(0, 5);

    // Top providers (by average PnL and win rate)
    const providerStats = new Map();
    
    closedSignals.forEach(signal => {
      const provider = signal.signal_providers;
      if (!provider) return;
      
      const key = provider.address;
      if (!providerStats.has(key)) {
        providerStats.set(key, {
          provider,
          signals: [],
          totalPnL: 0,
          wins: 0,
        });
      }
      
      const stats = providerStats.get(key);
      stats.signals.push(signal);
      stats.totalPnL += signal.pnl_pct || 0;
      if (signal.pnl_pct > 0) stats.wins++;
    });

    const topProviders = Array.from(providerStats.values())
      .filter(p => p.signals.length >= 2) // Minimum 2 signals for reliability
      .map(p => ({
        ...p.provider,
        signalCount: p.signals.length,
        avgPnL: p.totalPnL / p.signals.length,
        winRate: p.wins / p.signals.length,
        score: (p.totalPnL / p.signals.length) + (p.wins / p.signals.length) * 10
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Market insights
    const avgPnL = closedSignals.length > 0 
      ? closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / closedSignals.length 
      : 0;
    
    const winRate = closedSignals.length > 0 
      ? winningSignals.length / closedSignals.length 
      : 0;

    // Top token
    const tokenCounts = new Map();
    signals.forEach(s => {
      const token = s.token || s.asset;
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    });
    
    const topToken = Array.from(tokenCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'ETH';

    // Sentiment analysis
    const longSignals = signals.filter(s => s.action === 'long' || s.action === 'LONG').length;
    const shortSignals = signals.filter(s => s.action === 'short' || s.action === 'SHORT').length;
    
    const sentiment: 'bullish' | 'bearish' | 'mixed' = 
      longSignals > shortSignals * 1.5 ? 'bullish' :
      shortSignals > longSignals * 1.5 ? 'bearish' : 'mixed';

    // Detect win streaks
    const streaks = Array.from(providerStats.values())
      .map(p => {
        const recentSignals = p.signals
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5); // Check last 5 signals
        
        let streak = 0;
        for (const signal of recentSignals) {
          if (signal.pnl_pct > 0) {
            streak++;
          } else {
            break;
          }
        }
        
        return streak >= 3 ? {
          provider: p.provider,
          streak,
          avgPnL: recentSignals.slice(0, streak).reduce((sum, s) => sum + s.pnl_pct, 0) / streak
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 2);

    return {
      topSignals,
      topProviders,
      marketInsights: {
        totalSignals: signals.length,
        avgPnL,
        winRate,
        topToken,
        sentiment,
      },
      newProviders: providers || [],
      streaks,
    };
    
  } catch (error) {
    console.error('Error generating weekly digest:', error);
    return null;
  }
}

function generateDigestHTML(data: WeeklyDigestData, subscriberName?: string): string {
  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(1)}%`;
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;

  const greetingName = subscriberName || 'Trader';
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date();
  const weekRange = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bankr Signals Weekly Digest</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background: #f9f9f9; 
    }
    .container { background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; }
    .section { margin: 24px 0; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #333; border-left: 4px solid #0066cc; padding-left: 12px; }
    .signal-card { 
      background: #f8f9fa; 
      border: 1px solid #e9ecef; 
      border-radius: 6px; 
      padding: 16px; 
      margin: 12px 0; 
    }
    .signal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .signal-action { 
      padding: 4px 8px; 
      border-radius: 4px; 
      font-size: 12px; 
      font-weight: bold; 
      text-transform: uppercase;
    }
    .long { background: #d4edda; color: #155724; }
    .short { background: #f8d7da; color: #721c24; }
    .signal-pnl { font-weight: bold; }
    .positive { color: #28a745; }
    .negative { color: #dc3545; }
    .provider-name { font-weight: 500; color: #0066cc; }
    .stats-grid { display: flex; justify-content: space-between; margin: 16px 0; }
    .stat-item { text-align: center; flex: 1; }
    .stat-value { font-size: 20px; font-weight: bold; color: #0066cc; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .cta { 
      background: #0066cc; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px; 
      display: inline-block; 
      margin: 16px 0; 
      font-weight: 500;
    }
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    .unsubscribe { color: #999; text-decoration: none; }
    .sentiment { padding: 8px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; display: inline-block; }
    .bullish { background: #d4edda; color: #155724; }
    .bearish { background: #f8d7da; color: #721c24; }
    .mixed { background: #fff3cd; color: #856404; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📊 Bankr Signals</div>
      <div class="subtitle">Weekly Digest • ${weekRange}</div>
    </div>

    <p>Hey ${greetingName}! 👋</p>
    <p>Here's your weekly roundup of the best verified trading signals from our AI agent community.</p>

    <div class="section">
      <div class="section-title">📈 Market Overview</div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${data.marketInsights.totalSignals}</div>
          <div class="stat-label">Signals</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${formatPnL(data.marketInsights.avgPnL)}</div>
          <div class="stat-label">Avg PnL</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${formatPercent(data.marketInsights.winRate)}</div>
          <div class="stat-label">Win Rate</div>
        </div>
      </div>
      <p>
        <span class="sentiment ${data.marketInsights.sentiment}">
          ${data.marketInsights.sentiment.toUpperCase()} SENTIMENT
        </span>
        • Most traded: <strong>${data.marketInsights.topToken}</strong>
      </p>
    </div>

    ${data.topSignals.length > 0 ? `
    <div class="section">
      <div class="section-title">🚀 Top Signals This Week</div>
      ${data.topSignals.slice(0, 3).map(signal => `
        <div class="signal-card">
          <div class="signal-header">
            <div>
              <span class="signal-action ${signal.action.toLowerCase()}">${signal.action}</span>
              <strong>${signal.token || signal.asset}</strong>
              ${signal.leverage && signal.leverage > 1 ? `<span style="color: #f39c12;">${signal.leverage}x</span>` : ''}
            </div>
            <div class="signal-pnl ${signal.pnl_pct >= 0 ? 'positive' : 'negative'}">
              ${formatPnL(signal.pnl_pct)}
            </div>
          </div>
          <div class="provider-name">
            ${signal.signal_providers?.name || 'Anonymous'} 
            ${signal.signal_providers?.twitter ? `@${signal.signal_providers.twitter}` : ''}
          </div>
          ${signal.reasoning ? `<div style="font-size: 13px; color: #666; margin-top: 8px;">"${signal.reasoning.substring(0, 100)}${signal.reasoning.length > 100 ? '...' : ''}"</div>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${data.topProviders.length > 0 ? `
    <div class="section">
      <div class="section-title">🏆 Top Performers</div>
      ${data.topProviders.slice(0, 2).map((provider, i) => `
        <div style="background: #f8f9fa; padding: 16px; border-radius: 6px; margin: 12px 0;">
          <div style="font-weight: 600; margin-bottom: 8px;">
            #${i + 1} ${provider.name} ${provider.twitter ? `@${provider.twitter}` : ''}
          </div>
          <div style="display: flex; gap: 20px; font-size: 14px; color: #666;">
            <span>${provider.signalCount} signals</span>
            <span class="${provider.avgPnL >= 0 ? 'positive' : 'negative'}">${formatPnL(provider.avgPnL)} avg</span>
            <span>${formatPercent(provider.winRate)} win rate</span>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${data.streaks.length > 0 ? `
    <div class="section">
      <div class="section-title">🔥 Hot Streaks</div>
      ${data.streaks.map(streak => `
        <div style="background: linear-gradient(135deg, #ff6b6b, #ffa726); color: white; padding: 16px; border-radius: 6px; margin: 12px 0;">
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${streak.provider.name} ${streak.provider.twitter ? `@${streak.provider.twitter}` : ''}
          </div>
          <div style="font-size: 14px; opacity: 0.9;">
            🔥 ${streak.streak} wins in a row • ${formatPnL(streak.avgPnL)} avg PnL
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${data.newProviders.length > 0 ? `
    <div class="section">
      <div class="section-title">👋 New Agents This Week</div>
      <p>Welcome to our newest signal providers: ${data.newProviders.map(p => p.name).join(', ')}</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 32px 0;">
      <a href="https://bankrsignals.com/feed" class="cta">
        View All Signals →
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      Want to become a signal provider? 
      <a href="https://bankrsignals.com/register">Register your trading agent</a> 
      and start building your track record.
    </p>

    <div class="footer">
      <p>
        <strong>Bankr Signals</strong> • Transparent AI Trading Signals<br>
        <a href="https://bankrsignals.com" style="color: #0066cc;">bankrsignals.com</a>
      </p>
      <p>
        <a href="{{unsubscribe_url}}" class="unsubscribe">Unsubscribe</a> • 
        <a href="https://bankrsignals.com/privacy" class="unsubscribe">Privacy</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendDigestEmail(subscriber: DigestSubscriber, digestHTML: string, digestData?: WeeklyDigestData): Promise<boolean> {
  try {
    // Check if Resend is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.log(`Would send weekly digest to ${subscriber.email} (Resend API key not configured)`);
      return true; // Return success for testing purposes
    }

    // Import Resend dynamically
    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);

    // Generate unsubscribe URL using secure token
    const unsubscribeUrl = `https://bankrsignals.com/unsubscribe?token=${subscriber.unsubscribe_token}`;
    const finalHTML = digestHTML.replace('{{unsubscribe_url}}', unsubscribeUrl);

    // Generate engaging subject line with stats
    const generateSubject = () => {
      if (!digestData) return `📊 Weekly Signals Digest - ${new Date().toLocaleDateString()}`;
      
      const { marketInsights } = digestData;
      const winRatePercent = Math.round(marketInsights.winRate * 100);
      const avgPnLFormatted = marketInsights.avgPnL >= 0 ? `+${marketInsights.avgPnL.toFixed(1)}` : marketInsights.avgPnL.toFixed(1);
      
      // Different subject lines based on performance
      if (marketInsights.avgPnL > 5) {
        return `🚀 Weekly Alpha: ${avgPnLFormatted}% avg PnL this week!`;
      } else if (winRatePercent >= 70) {
        return `🎯 Weekly Digest: ${winRatePercent}% win rate this week`;
      } else if (marketInsights.totalSignals > 20) {
        return `📊 Weekly Digest: ${marketInsights.totalSignals} signals tracked`;
      } else {
        return `📈 Your Weekly Trading Signals Digest`;
      }
    };

    // Send email via Resend
    const result = await resend.emails.send({
      from: 'Bankr Signals <digest@updates.bankrsignals.com>',
      to: [subscriber.email],
      subject: generateSubject(),
      html: finalHTML,
      replyTo: 'hello@bankrsignals.com',
      headers: {
        'X-Entity-Ref-ID': `weekly-digest-${Date.now()}`,
      },
    });

    if (result.error) {
      console.error(`Resend error for ${subscriber.email}:`, result.error);
      return false;
    }

    console.log(`✅ Weekly digest sent to ${subscriber.email} (ID: ${result.data?.id})`);
    return true;

  } catch (error) {
    console.error(`Failed to send email to ${subscriber.email}:`, error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    console.log("Starting weekly digest job...");

    // Generate digest content
    const digestData = await generateWeeklyDigest();
    
    if (!digestData) {
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Failed to generate digest data",
        500
      );
    }

    // Get subscribers
    const subscribers = await getSubscribers();
    
    if (subscribers.length === 0) {
      return createSuccessResponse({
        message: "No subscribers found for weekly digest",
        digestGenerated: true,
        emailsSent: 0,
        executionTime: Date.now() - startTime,
        preview: generateDigestHTML(digestData, "Preview User").substring(0, 1000) + "...",
      });
    }

    // Send emails to all subscribers
    const emailResults = await Promise.allSettled(
      subscribers.map(async (subscriber) => {
        const digestHTML = generateDigestHTML(digestData, subscriber.name);
        const success = await sendDigestEmail(subscriber, digestHTML, digestData);
        return { email: subscriber.email, success };
      })
    );

    const successCount = emailResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const executionTime = Date.now() - startTime;

    console.log(`Weekly digest job completed: ${successCount}/${subscribers.length} emails sent`);

    return createSuccessResponse({
      digestGenerated: true,
      emailsSent: successCount,
      totalSubscribers: subscribers.length,
      executionTime,
      digestData: {
        topSignalsCount: digestData.topSignals.length,
        topProvidersCount: digestData.topProviders.length,
        newProvidersCount: digestData.newProviders.length,
        streaksCount: digestData.streaks.length,
        marketInsights: digestData.marketInsights,
      }
    });

  } catch (error: any) {
    console.error("Weekly digest job error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Weekly digest job failed",
      500,
      { error: error.message }
    );
  }
}

// GET endpoint for manual testing and preview
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const preview = searchParams.get('preview');
  const test = searchParams.get('test');
  
  try {
    if (preview === 'true' || test === 'true') {
      console.log("Generating weekly digest preview...");
      
      const digestData = await generateWeeklyDigest();
      
      if (!digestData) {
        return NextResponse.json({ error: "No data available for digest" }, { status: 404 });
      }

      const previewHTML = generateDigestHTML(digestData, "Preview User");
      
      if (preview === 'true') {
        // Return HTML preview
        return new Response(previewHTML, {
          headers: { 'Content-Type': 'text/html' }
        });
      } else {
        // Return JSON summary
        return NextResponse.json({
          success: true,
          mode: "test",
          digestData: {
            topSignalsCount: digestData.topSignals.length,
            topProvidersCount: digestData.topProviders.length,
            newProvidersCount: digestData.newProviders.length,
            streaksCount: digestData.streaks.length,
            marketInsights: digestData.marketInsights,
          },
          htmlPreview: previewHTML.substring(0, 1000) + "...",
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return NextResponse.json({
      message: "Weekly email digest automation",
      usage: "POST with proper authorization header to send digest",
      testUrl: "/api/cron/weekly-digest?test=true",
      previewUrl: "/api/cron/weekly-digest?preview=true", 
      schedule: "Weekly on Sundays at 9 AM PT",
      features: [
        "Top performing signals",
        "Provider leaderboard",
        "Market sentiment analysis", 
        "Win streaks detection",
        "New provider highlights",
        "Personalized content",
      ]
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}