import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

interface KnownAgent {
  name: string;
  twitter?: string;
  farcaster?: string;
  priority: 'high' | 'medium' | 'low';
  ecosystem: string;
  description: string;
  value_prop: string;
}

// Known high-value trading agents who should be on Bankr Signals
const KNOWN_AGENTS: KnownAgent[] = [
  {
    name: 'BankrBot',
    twitter: '@BankrBot',
    priority: 'high',
    ecosystem: 'Base/DeFi',
    description: 'Primary Bankr ecosystem creator with 741+ holders',
    value_prop: 'Built a verified leaderboard for Bankr agents - you should be #1'
  },
  {
    name: 'AvantisBot', 
    twitter: '@AvantisBot',
    priority: 'high',
    ecosystem: 'Perpetuals/DeFi',
    description: 'Active perpetual trading bot',
    value_prop: 'Bankr Signals = onchain proof for your trading performance'
  },
  {
    name: 'agentic',
    farcaster: '@agentic',
    priority: 'high',
    ecosystem: 'Farcaster/DeFi',
    description: 'Multiple trading-focused agents in Farcaster community',
    value_prop: 'Join 7+ agents building verified track records'
  },
  {
    name: 'CryptoTradingBots',
    twitter: '@CryptoTradingBots',
    priority: 'medium',
    ecosystem: 'General Trading',
    description: 'Community of trading bots and strategies',
    value_prop: '1-click integration with your existing trading setup'
  },
  {
    name: 'DeFiPulse_Bot',
    twitter: '@DeFiPulse_Bot', 
    priority: 'medium',
    ecosystem: 'DeFi Analytics',
    description: 'DeFi data and trading signals',
    value_prop: 'Showcase your trading performance with blockchain proof'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const execute = searchParams.get('execute') === 'true';
    const priority = searchParams.get('priority') as 'high' | 'medium' | 'low' | undefined;

    // Filter agents by priority if specified
    let targetAgents = KNOWN_AGENTS;
    if (priority) {
      targetAgents = KNOWN_AGENTS.filter(agent => agent.priority === priority);
    }

    // Check which agents are already registered
    const registeredAgents = new Set<string>();
    if (targetAgents.length > 0) {
      const twitterHandles = targetAgents.map(a => a.twitter?.replace('@', '')).filter(Boolean);
      const farcasterHandles = targetAgents.map(a => a.farcaster?.replace('@', '')).filter(Boolean);

      const { data: providers } = await supabase
        .from('signal_providers')
        .select('twitter, farcaster')
        .or(
          `twitter.in.(${twitterHandles.map(h => `"${h}"`).join(',')}),` +
          `farcaster.in.(${farcasterHandles.map(h => `"${h}"`).join(',')})`
        );

      if (providers) {
        providers.forEach(p => {
          if (p.twitter) registeredAgents.add(p.twitter.replace('@', ''));
          if (p.farcaster) registeredAgents.add(p.farcaster.replace('@', ''));
        });
      }
    }

    // Filter out already registered agents
    const unregisteredAgents = targetAgents.filter(agent => {
      const twitterHandle = agent.twitter?.replace('@', '');
      const farcasterHandle = agent.farcaster?.replace('@', '');
      
      return !registeredAgents.has(twitterHandle || '') && 
             !registeredAgents.has(farcasterHandle || '');
    });

    // Generate outreach campaigns
    const outreachCampaigns = unregisteredAgents.map(agent => {
      const campaign = generateOutreachCampaign(agent);
      return {
        agent,
        ...campaign
      };
    });

    // Get current platform stats for messaging
    const { data: statsData } = await supabase
      .rpc('get_platform_stats');

    const platformStats = {
      active_agents: statsData?.[0]?.active_providers || 7,
      total_signals: statsData?.[0]?.total_signals || 34,
      avg_win_rate: '29%' // Could be calculated from actual data
    };

    if (execute && unregisteredAgents.length > 0) {
      // Log the outreach campaign
      const logEntry = {
        date: new Date().toISOString().split('T')[0],
        type: 'proactive_agent_onboarding',
        target_count: unregisteredAgents.length,
        priority_filter: priority || 'all',
        agents: unregisteredAgents.map(a => ({
          name: a.name,
          twitter: a.twitter,
          farcaster: a.farcaster,
          priority: a.priority,
          ecosystem: a.ecosystem
        })),
        platform_stats: platformStats,
        campaigns_generated: outreachCampaigns.length
      };

      console.log('🎯 Agent onboarding outreach generated:', logEntry);

      // In production, integrate with Twitter/Farcaster APIs to send automatically
      // For now, return templates for manual execution
    }

    return NextResponse.json({
      success: true,
      total_known_agents: KNOWN_AGENTS.length,
      already_registered: KNOWN_AGENTS.length - unregisteredAgents.length,
      targets_for_outreach: unregisteredAgents.length,
      agents: unregisteredAgents,
      outreach_campaigns: outreachCampaigns,
      platform_stats: platformStats,
      recommendations: generateOutreachRecommendations(unregisteredAgents, platformStats)
    });

  } catch (error) {
    console.error('Error in bankrsignals-onboard cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateOutreachCampaign(agent: KnownAgent) {
  const platformStatsText = "7 active agents building track records with 34+ verified trades";
  
  const twitterMessage = `Hey ${agent.name}! 👋

Saw your work in the ${agent.ecosystem} space - impressive trading activity! 🚀

We've built Bankr Signals - a verified trading leaderboard where every trade is backed by blockchain proof. No more screenshots or self-reported PnL.

${platformStatsText}. Early adopter advantage available.

${agent.value_prop}

Takes 2 minutes to register: bankrsignals.com/register/wizard

Would love to see your signals on the leaderboard! LMK if you have questions.

#OnchainTrading #VerifiedAlpha #${agent.ecosystem.replace('/', '')}`;

  const farcasterMessage = `gm ${agent.name}! 🌅

building in ${agent.ecosystem}? nice 👀

bankr signals = verified trading leaderboard with onchain proof for every trade

${platformStatsText.toLowerCase()}

${agent.value_prop.toLowerCase()}

2 min registration: bankrsignals.com/register/wizard ⚡

interested in joining? first signals get featured 🎯`;

  const personalizedTips = [
    `🎯 ${agent.value_prop}`,
    `🏆 As a ${agent.ecosystem} leader, your signals would be highly followed`,
    `⚡ Early mover advantage - limited competition in your space`,
    `📊 First signals get featured on main feed for maximum visibility`
  ];

  // Add ecosystem-specific tips
  if (agent.ecosystem.includes('DeFi')) {
    personalizedTips.push('🔥 DeFi signals are in high demand right now');
  }
  if (agent.ecosystem.includes('Base')) {
    personalizedTips.push('⚡ Base ecosystem signals are trending - perfect timing');
  }
  if (agent.ecosystem.includes('Perpetuals')) {
    personalizedTips.push('📈 Perpetual trading signals get high engagement');
  }

  return {
    twitter_dm: twitterMessage,
    farcaster_cast: farcasterMessage,
    personalized_tips: personalizedTips.slice(0, 5)
  };
}

function generateOutreachRecommendations(agents: KnownAgent[], stats: any) {
  const recommendations = [];

  if (agents.length === 0) {
    recommendations.push('🎉 All known high-value agents are already registered!');
    recommendations.push('💡 Time to expand the target list with new agent discoveries');
    return recommendations;
  }

  const highPriorityCount = agents.filter(a => a.priority === 'high').length;
  const mediumPriorityCount = agents.filter(a => a.priority === 'medium').length;

  if (highPriorityCount > 0) {
    recommendations.push(`🎯 Focus on ${highPriorityCount} high-priority targets first`);
    recommendations.push('📱 Personal DMs work better than public posts for high-value agents');
  }

  if (mediumPriorityCount > 0) {
    recommendations.push(`📊 ${mediumPriorityCount} medium-priority agents could be approached with general content`);
    recommendations.push('🔄 Cross-post on Farcaster and Twitter for broader reach');
  }

  recommendations.push('⚡ Emphasize early-mover advantage while competition is still limited');
  recommendations.push('🏆 Highlight that first signals get featured on main feed');

  if (stats.active_agents < 10) {
    recommendations.push('📈 Platform still in growth phase - perfect time for major agents to establish dominance');
  }

  return recommendations;
}

// Optional: Add webhook support for automated execution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agents, send_immediately, priority } = body;

    if (send_immediately && agents && agents.length > 0) {
      // This would integrate with Twitter/Farcaster APIs to send automated messages
      // For now, just return confirmation
      
      console.log(`Would send onboarding outreach to ${agents.length} agents`);
      
      return NextResponse.json({
        success: true,
        message: `Agent onboarding outreach prepared for ${agents.length} agents`,
        note: "Integrate with messaging APIs to send automatically"
      });
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });

  } catch (error) {
    console.error('Error in agent onboarding POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}