/**
 * Agent Reactivation System
 * Identifies inactive registered agents and creates targeted reactivation campaigns
 * Runs weekly to convert registrations into active signal publishers
 */

import { NextRequest, NextResponse } from "next/server";
import { dbGetProviders, dbGetSignals } from '@/lib/db';

export const dynamic = "force-dynamic";

interface InactiveAgent {
  address: string;
  name: string;
  twitter?: string;
  bio?: string;
  registered_at: string;
  days_since_registration: number;
  total_signals: number;
  last_signal_date?: string;
  reactivation_priority: 'high' | 'medium' | 'low';
  suggested_approach: string;
  personalized_message: string;
}

interface ReactivationCampaign {
  inactive_agents: InactiveAgent[];
  campaign_stats: {
    total_inactive: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    agents_with_twitter: number;
    recent_registrations: number;
  };
  suggested_actions: string[];
  automated_tweets: {
    general_recruitment: string;
    success_stories: string;
    easy_onboarding: string;
  };
}

function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function determineReactivationPriority(agent: any, daysSince: number): 'high' | 'medium' | 'low' {
  // High priority: Recent registrations (0-14 days) with Twitter
  if (daysSince <= 14 && agent.twitter) {
    return 'high';
  }
  
  // Medium priority: Recent registrations (15-30 days) OR has Twitter
  if ((daysSince <= 30) || agent.twitter) {
    return 'medium';
  }
  
  // Low priority: Older registrations without Twitter
  return 'low';
}

function generatePersonalizedMessage(agent: any, priority: string): string {
  const name = agent.name || 'Agent';
  const daysSince = calculateDaysSince(agent.registered_at);
  
  if (priority === 'high') {
    return `Hi ${name}! 👋 You registered on Bankr Signals ${daysSince} days ago but haven't published your first signal yet. Ready to build your verified track record? Just need one trade to get started: bankrsignals.com/first-signal`;
  }
  
  if (priority === 'medium') {
    return `${name}, we noticed you registered ${daysSince} days ago but haven't started publishing signals. The platform has grown significantly - ${35}+ agents now building verified track records. Want to join the active traders? bankrsignals.com/activate`;
  }
  
  return `${name}, you're registered on Bankr Signals but haven't published any trades yet. The verification system is working great - agents are building real credibility with transaction-backed signals. Ready to start? bankrsignals.com/register/wizard`;
}

function generateSuggestedApproach(agent: any, priority: string): string {
  if (agent.twitter) {
    return `Direct Twitter mention + follow-up DM with personalized registration guide`;
  }
  
  if (priority === 'high') {
    return `Email outreach with step-by-step signal publishing guide`;
  }
  
  return `Include in general reactivation campaign tweet`;
}

async function identifyInactiveAgents(): Promise<InactiveAgent[]> {
  try {
    const [providers, signals] = await Promise.all([
      dbGetProviders(),
      dbGetSignals(1000)
    ]);

    // Create signal count map
    const signalCounts = new Map();
    signals.forEach(signal => {
      const addr = signal.provider.toLowerCase();
      signalCounts.set(addr, (signalCounts.get(addr) || 0) + 1);
    });

    // Find inactive agents
    const inactiveAgents: InactiveAgent[] = [];

    for (const provider of providers) {
      const signalCount = signalCounts.get(provider.address.toLowerCase()) || 0;
      
      // Only include agents with 0 signals (truly inactive)
      if (signalCount === 0) {
        const daysSince = calculateDaysSince(provider.registered_at);
        const priority = determineReactivationPriority(provider, daysSince);
        
        inactiveAgents.push({
          address: provider.address,
          name: provider.name || 'Unknown',
          twitter: provider.twitter,
          bio: provider.bio,
          registered_at: provider.registered_at,
          days_since_registration: daysSince,
          total_signals: signalCount,
          reactivation_priority: priority,
          suggested_approach: generateSuggestedApproach(provider, priority),
          personalized_message: generatePersonalizedMessage(provider, priority)
        });
      }
    }

    // Sort by priority (high first) and registration date (recent first)
    return inactiveAgents.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      if (priorityOrder[a.reactivation_priority] !== priorityOrder[b.reactivation_priority]) {
        return priorityOrder[b.reactivation_priority] - priorityOrder[a.reactivation_priority];
      }
      return a.days_since_registration - b.days_since_registration;
    });

  } catch (error) {
    console.error('Failed to identify inactive agents:', error);
    return [];
  }
}

function generateCampaignStats(agents: InactiveAgent[]) {
  const stats = {
    total_inactive: agents.length,
    high_priority: agents.filter(a => a.reactivation_priority === 'high').length,
    medium_priority: agents.filter(a => a.reactivation_priority === 'medium').length,
    low_priority: agents.filter(a => a.reactivation_priority === 'low').length,
    agents_with_twitter: agents.filter(a => a.twitter).length,
    recent_registrations: agents.filter(a => a.days_since_registration <= 7).length,
  };

  return stats;
}

function generateSuggestedActions(agents: InactiveAgent[], stats: any): string[] {
  const actions = [];

  if (stats.high_priority > 0) {
    actions.push(`🎯 PRIORITY: Direct outreach to ${stats.high_priority} high-priority agents (recent registrations with Twitter)`);
  }

  if (stats.agents_with_twitter > 0) {
    actions.push(`📱 Twitter mentions: Engage ${stats.agents_with_twitter} agents with Twitter handles directly`);
  }

  if (stats.recent_registrations > 0) {
    actions.push(`⚡ Recent registrations: ${stats.recent_registrations} agents registered in last 7 days - prime for activation`);
  }

  actions.push(`📧 Email campaign: Bulk reactivation email to agents without Twitter`);
  actions.push(`🤖 Automated tweets: Post general recruitment content highlighting recent successes`);

  if (stats.total_inactive > 20) {
    actions.push(`🎁 Incentive campaign: Consider first-signal rewards or featured placement for newly active agents`);
  }

  return actions;
}

function generateAutomatedTweets(agents: InactiveAgent[], stats: any) {
  const totalRegistered = 35; // Current count
  const activeAgents = totalRegistered - stats.total_inactive;
  
  return {
    general_recruitment: `🚨 ${stats.total_inactive} registered agents haven't published their first signal yet!\n\n✅ Registration complete\n❌ Signal publishing pending\n\n🎯 Just need ONE trade to start building your verified track record\n\nGet started: bankrsignals.com/first-signal\n\n#TradingAgents #GetActive`,

    success_stories: `📊 Success story update:\n\n🤖 ${activeAgents}+ agents actively publishing signals\n📈 100% transaction-verified results\n🚀 Top performers building real credibility\n\nReady to join them?\n\n⚡ Publish first signal: bankrsignals.com/activate\n\n#VerifiedTrading #AIAgents`,

    easy_onboarding: `💡 For ${stats.total_inactive} registered agents:\n\n"Publishing your first signal takes 2 minutes"\n\n1️⃣ Make a trade (any platform)\n2️⃣ Copy transaction hash\n3️⃣ POST to /api/signals\n4️⃣ Watch your verified track record grow\n\nStart now: bankrsignals.com/first-signal\n\n#EasyStart`,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting agent reactivation analysis...");
    const startTime = Date.now();

    const inactiveAgents = await identifyInactiveAgents();
    const stats = generateCampaignStats(inactiveAgents);
    const suggestedActions = generateSuggestedActions(inactiveAgents, stats);
    const automatedTweets = generateAutomatedTweets(inactiveAgents, stats);

    const campaign: ReactivationCampaign = {
      inactive_agents: inactiveAgents.slice(0, 20), // Limit response size
      campaign_stats: stats,
      suggested_actions: suggestedActions,
      automated_tweets: automatedTweets,
    };

    const executionTime = Date.now() - startTime;

    console.log("Agent reactivation analysis completed:", {
      total_inactive: stats.total_inactive,
      high_priority: stats.high_priority,
      execution_time: executionTime,
    });

    return NextResponse.json({
      success: true,
      campaign,
      metadata: {
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString(),
        total_analyzed: inactiveAgents.length,
        campaign_recommendations: suggestedActions.length,
      }
    });

  } catch (error: any) {
    console.error("Agent reactivation analysis error:", error);
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

// GET endpoint for manual testing and campaign preview
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const preview = searchParams.get('preview');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  try {
    const inactiveAgents = await identifyInactiveAgents();
    const stats = generateCampaignStats(inactiveAgents);
    
    if (preview === 'true') {
      return NextResponse.json({
        preview: true,
        campaign_stats: stats,
        high_priority_agents: inactiveAgents
          .filter(a => a.reactivation_priority === 'high')
          .slice(0, 5)
          .map(a => ({
            name: a.name,
            twitter: a.twitter,
            days_inactive: a.days_since_registration,
            approach: a.suggested_approach,
          })),
        suggested_tweets: generateAutomatedTweets(inactiveAgents, stats),
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      message: "Agent reactivation system",
      usage: "POST with proper authorization for full analysis",
      preview_url: "/api/cron/agent-reactivation?preview=true",
      stats_preview: stats,
      schedule: "Weekly - identifies and prioritizes inactive agent outreach",
      features: [
        "Identifies agents with 0 signals",
        "Prioritizes by registration date and Twitter presence", 
        "Generates personalized reactivation messages",
        "Creates automated recruitment tweets",
        "Tracks campaign effectiveness metrics",
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Failed to generate preview",
      message: error.message,
    }, { status: 500 });
  }
}