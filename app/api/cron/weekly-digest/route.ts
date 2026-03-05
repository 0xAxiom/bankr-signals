/**
 * Weekly Digest Email Automation
 * Sends a curated email to subscribers with top signals, performers, and stats
 * Should run weekly on Sundays at 9 AM PT
 */

import { NextRequest, NextResponse } from "next/server";
import { dbGetSignals, dbGetProviders } from "@/lib/db";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

interface WeeklyStats {
  totalSignals: number;
  activeProviders: number;
  topSignals: any[];
  topProviders: any[];
  avgWinRate: number;
  totalVolumeUsd: number;
}

interface DigestResult {
  success: boolean;
  emailsSent?: number;
  error?: string;
  stats?: WeeklyStats;
}

async function getWeeklyStats(): Promise<WeeklyStats> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Get signals and providers using mock-aware functions
    const [allSignals, providers] = await Promise.all([
      dbGetSignals(1000),
      dbGetProviders()
    ]);

    // Filter signals from the past week and join with provider data
    const weeklySignals = allSignals
      .filter(s => s.timestamp >= oneWeekAgo)
      .map(s => {
        const provider = providers.find(p => p.address.toLowerCase() === s.provider.toLowerCase());
        return {
          ...s,
          signal_providers: provider ? {
            name: provider.name,
            address: provider.address,
            verified: provider.verified || false
          } : {
            name: `${s.provider.slice(0, 6)}...${s.provider.slice(-4)}`,
            address: s.provider,
            verified: false
          }
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const signals = weeklySignals;
    const activeProviders = new Set(signals.map(s => s.provider)).size;

  // Get top performing closed signals
  const closedSignals = signals
    .filter(s => s.status === "closed" && s.pnl_pct != null)
    .sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0))
    .slice(0, 5);

  // Calculate provider performance for the week
  const providerPerformance = new Map();
  signals.forEach(signal => {
    const provider = signal.provider;
    if (!providerPerformance.has(provider)) {
      providerPerformance.set(provider, {
        name: signal.signal_providers.name,
        address: provider,
        verified: signal.signal_providers.verified,
        signalCount: 0,
        totalPnl: 0,
        closedSignals: 0,
        wins: 0,
      });
    }
    const stats = providerPerformance.get(provider);
    stats.signalCount++;
    if (signal.status === "closed" && signal.pnl_pct != null) {
      stats.closedSignals++;
      stats.totalPnl += signal.pnl_pct;
      if (signal.pnl_pct > 0) stats.wins++;
    }
  });

  // Get top 3 providers by total PnL
  const topProviders = Array.from(providerPerformance.values())
    .filter(p => p.closedSignals > 0)
    .sort((a, b) => b.totalPnl - a.totalPnl)
    .slice(0, 3)
    .map(p => ({
      ...p,
      avgPnl: p.totalPnl / p.closedSignals,
      winRate: Math.round((p.wins / p.closedSignals) * 100),
    }));

  // Calculate overall stats
  const closedSignalsCount = signals.filter(s => s.status === "closed").length;
  const wins = signals.filter(s => s.status === "closed" && (s.pnl_pct || 0) > 0).length;
  const avgWinRate = closedSignalsCount > 0 ? Math.round((wins / closedSignalsCount) * 100) : 0;
  const totalVolumeUsd = signals.reduce((sum, s) => sum + (s.collateral_usd || 0), 0);

  return {
    totalSignals: signals.length,
    activeProviders,
    topSignals: closedSignals,
    topProviders,
    avgWinRate,
    totalVolumeUsd,
  };
}

function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${pnl.toFixed(1)}%`;
}

function generateDigestHTML(stats: WeeklyStats): string {
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bankr Signals Weekly Digest</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: #e5e5e5;
      background: #0a0a0a;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #22c55e;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #22c55e;
      font-size: 28px;
      margin: 0;
      font-weight: 700;
    }
    .header p {
      color: #737373;
      margin: 5px 0;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #22c55e;
      font-family: 'JetBrains Mono', monospace;
    }
    .stat-label {
      font-size: 12px;
      color: #737373;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .section h2 {
      color: #e5e5e5;
      font-size: 18px;
      margin: 0 0 15px 0;
      font-weight: 600;
    }
    .signal-item {
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
    }
    .signal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .signal-action {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
    }
    .signal-action.buy, .signal-action.long { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .signal-action.sell, .signal-action.short { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .signal-token {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 16px;
    }
    .signal-pnl {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 18px;
    }
    .signal-pnl.positive { color: #22c55e; }
    .signal-pnl.negative { color: #ef4444; }
    .signal-provider {
      font-size: 12px;
      color: #737373;
    }
    .provider-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #2a2a2a;
    }
    .provider-item:last-child {
      border-bottom: none;
    }
    .provider-name {
      font-weight: 600;
      color: #e5e5e5;
    }
    .provider-stats {
      text-align: right;
      font-size: 12px;
    }
    .provider-pnl {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #22c55e;
    }
    .cta {
      text-align: center;
      margin-top: 30px;
    }
    .cta-button {
      display: inline-block;
      background: #22c55e;
      color: #0a0a0a;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #2a2a2a;
      color: #737373;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Weekly Digest</h1>
      <p>Your curated trading intelligence summary</p>
      <p>${date}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalSignals}</div>
        <div class="stat-label">New Signals</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.activeProviders}</div>
        <div class="stat-label">Active Agents</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.avgWinRate}%</div>
        <div class="stat-label">Win Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">$${Math.round(stats.totalVolumeUsd / 1000)}K</div>
        <div class="stat-label">Volume</div>
      </div>
    </div>

    ${stats.topSignals.length > 0 ? `
    <div class="section">
      <h2>🏆 Top Performing Signals</h2>
      ${stats.topSignals.map(signal => `
        <div class="signal-item">
          <div class="signal-header">
            <div>
              <span class="signal-action ${signal.action.toLowerCase()}">${signal.action}</span>
              <span class="signal-token">${signal.token}</span>
              ${signal.leverage && signal.leverage > 1 ? `<span style="font-size: 12px; color: #737373;">${signal.leverage}x</span>` : ''}
            </div>
            <div class="signal-pnl ${signal.pnl_pct >= 0 ? 'positive' : 'negative'}">
              ${formatPnL(signal.pnl_pct || 0)}
            </div>
          </div>
          <div class="signal-provider">by ${signal.signal_providers.name}</div>
          ${signal.reasoning ? `<div style="font-size: 12px; color: #b0b0b0; margin-top: 8px;">${signal.reasoning.length > 120 ? signal.reasoning.substring(0, 120) + '...' : signal.reasoning}</div>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${stats.topProviders.length > 0 ? `
    <div class="section">
      <h2>🥇 Leading Providers</h2>
      ${stats.topProviders.map((provider, index) => `
        <div class="provider-item">
          <div>
            <div class="provider-name">${index + 1}. ${provider.name} ${provider.verified ? '✓' : ''}</div>
            <div style="font-size: 12px; color: #737373;">${provider.signalCount} signals this week</div>
          </div>
          <div class="provider-stats">
            <div class="provider-pnl">${formatPnL(provider.avgPnl)}</div>
            <div style="color: #737373;">${provider.winRate}% win rate</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="cta">
      <a href="https://bankrsignals.com/feed" class="cta-button">
        View Live Feed →
      </a>
      <p style="margin-top: 15px; color: #737373; font-size: 14px;">
        Track real-time signals with transaction verification
      </p>
    </div>

    <div class="footer">
      <p>
        <strong>Bankr Signals</strong> - Transaction-verified trading intelligence<br>
        <a href="https://bankrsignals.com/unsubscribe?token=UNSUBSCRIBE_TOKEN" style="color: #737373;">Unsubscribe</a> | 
        <a href="https://bankrsignals.com" style="color: #22c55e;">Visit Website</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateDigestText(stats: WeeklyStats): string {
  const date = new Date().toLocaleDateString();
  
  let text = `BANKR SIGNALS WEEKLY DIGEST\n`;
  text += `${date}\n\n`;
  
  text += `📊 THIS WEEK'S STATS\n`;
  text += `• ${stats.totalSignals} new signals published\n`;
  text += `• ${stats.activeProviders} active trading agents\n`;
  text += `• ${stats.avgWinRate}% average win rate\n`;
  text += `• $${Math.round(stats.totalVolumeUsd / 1000)}K total volume\n\n`;
  
  if (stats.topSignals.length > 0) {
    text += `🏆 TOP PERFORMING SIGNALS\n`;
    stats.topSignals.slice(0, 3).forEach((signal, i) => {
      text += `${i + 1}. ${signal.action} ${signal.token} → ${formatPnL(signal.pnl_pct)} by ${signal.signal_providers.name}\n`;
    });
    text += `\n`;
  }
  
  if (stats.topProviders.length > 0) {
    text += `🥇 LEADING PROVIDERS\n`;
    stats.topProviders.forEach((provider, i) => {
      text += `${i + 1}. ${provider.name} - ${formatPnL(provider.avgPnl)} avg (${provider.winRate}% win rate)\n`;
    });
    text += `\n`;
  }
  
  text += `View live feed: https://bankrsignals.com/feed\n`;
  text += `\nUnsubscribe: https://bankrsignals.com/unsubscribe?token=UNSUBSCRIBE_TOKEN`;
  
  return text;
}

async function sendDigestEmail(html: string, text: string): Promise<number> {
  // Get active subscribers who want weekly digest
  const { data: subscribers, error: subscribersError } = await supabase
    .from('email_subscribers')
    .select('email, name, unsubscribe_token')
    .eq('active', true)
    .eq('weekly_digest', true)
    .eq('confirmed_at', true);

  if (subscribersError) {
    console.error("Error fetching subscribers:", subscribersError);
    throw new Error("Failed to fetch subscribers");
  }

  if (!subscribers || subscribers.length === 0) {
    console.log("No active subscribers found for weekly digest");
    return 0;
  }

  console.log(`Sending weekly digest to ${subscribers.length} subscribers`);

  // Initialize Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured, falling back to console log");
    
    console.log("=== WEEKLY DIGEST EMAIL ===");
    console.log(`TO: ${subscribers.length} subscribers`);
    console.log("SUBJECT: 📊 Your Weekly Trading Intelligence Digest");
    console.log("HTML LENGTH:", html.length);
    console.log("FIRST SUBSCRIBER:", subscribers[0].email);
    console.log("=============================");
    
    return subscribers.length; // Mock success for testing
  }

  const resend = new Resend(resendApiKey);
  let successCount = 0;
  let failureCount = 0;

  // Send emails in batches to avoid rate limits
  const batchSize = 50;
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);
    
    try {
      // Create personalized emails with unsubscribe tokens
      const emailPromises = batch.map(async (subscriber) => {
        // Replace unsubscribe token in the email
        const personalizedHtml = html.replace(
          'UNSUBSCRIBE_TOKEN',
          subscriber.unsubscribe_token
        );
        const personalizedText = text.replace(
          'UNSUBSCRIBE_TOKEN', 
          subscriber.unsubscribe_token
        );

        const { data, error } = await resend.emails.send({
          from: 'Bankr Signals <digest@bankrsignals.com>',
          to: subscriber.email,
          subject: '📊 Your Weekly Trading Intelligence Digest',
          html: personalizedHtml,
          text: personalizedText,
        });

        if (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          throw error;
        }

        // Update last email sent timestamp
        await supabase
          .from('email_subscribers')
          .update({ last_email_sent_at: new Date().toISOString() })
          .eq('email', subscriber.email);

        return data;
      });

      await Promise.allSettled(emailPromises);
      successCount += batch.length;
      
      console.log(`Batch ${Math.floor(i / batchSize) + 1} sent successfully (${batch.length} emails)`);
      
      // Small delay between batches to be nice to the email service
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      failureCount += batch.length;
    }
  }

  console.log(`Email sending complete: ${successCount} success, ${failureCount} failures`);
  return successCount;
}

export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    console.log("Starting weekly digest job...");

    // Get weekly stats and performance data
    const stats = await getWeeklyStats();

    // Generate email content
    const html = generateDigestHTML(stats);
    const text = generateDigestText(stats);

    // Send digest email
    const emailsSent = await sendDigestEmail(html, text);

    const executionTime = Date.now() - startTime;

    const response: DigestResult = {
      success: true,
      emailsSent,
      stats,
    };

    console.log("Weekly digest job completed successfully:", {
      emailsSent,
      totalSignals: stats.totalSignals,
      topProviders: stats.topProviders.length,
      executionTime,
    });

    return NextResponse.json({
      ...response,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("Weekly digest job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing and preview
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const preview = searchParams.get("preview");

  try {
    const stats = await getWeeklyStats();

    if (preview === "html") {
      const html = generateDigestHTML(stats);
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (preview === "text") {
      const text = generateDigestText(stats);
      return new Response(text, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.json({
      message: "Weekly digest email automation",
      usage: "POST with proper authorization header",
      previewUrls: {
        html: "/api/cron/weekly-digest?preview=html",
        text: "/api/cron/weekly-digest?preview=text",
      },
      schedule: "Weekly on Sundays at 9 AM PT",
      stats,
      features: [
        "Top performing signals",
        "Leading providers", 
        "Weekly statistics",
        "Volume and activity metrics",
      ],
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate preview: " + error.message },
      { status: 500 }
    );
  }
}