import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const alert_threshold = parseInt(searchParams.get('alert_threshold') || '3');
  const max_dormant_days = parseInt(searchParams.get('max_dormant_days') || '14');

  try {
    // Get dormant agents (registered but no signals)
    const { data: providers, error } = await supabase
      .from('providers')
      .select('*')
      .is('signals_count', null)
      .gte('registered_at', new Date(Date.now() - max_dormant_days * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
    }

    const dormantAgents = providers.map(provider => ({
      name: provider.name,
      address: provider.address,
      registered_at: provider.registered_at,
      twitter: provider.twitter,
      farcaster: provider.farcaster,
      daysSinceRegistration: Math.floor((Date.now() - new Date(provider.registered_at).getTime()) / (1000 * 60 * 60 * 24))
    }));

    // Filter by alert threshold
    const alertWorthy = dormantAgents.filter(agent => agent.daysSinceRegistration >= alert_threshold);
    
    // Generate summary stats
    const stats = {
      total_dormant: dormantAgents.length,
      alert_worthy: alertWorthy.length,
      by_urgency: {
        new_registrations: dormantAgents.filter(a => a.daysSinceRegistration <= 1).length,
        need_gentle_nudge: dormantAgents.filter(a => a.daysSinceRegistration > 1 && a.daysSinceRegistration <= 3).length,
        need_re_engagement: dormantAgents.filter(a => a.daysSinceRegistration > 3).length
      },
      avg_days_dormant: dormantAgents.length > 0 
        ? Math.round(dormantAgents.reduce((sum, a) => sum + a.daysSinceRegistration, 0) / dormantAgents.length)
        : 0
    };

    // Generate alert message if needed
    let alertMessage = '';
    if (alertWorthy.length > 0) {
      alertMessage = `🚨 Bankr Signals Dormant Agent Alert

${stats.alert_worthy} agents registered but haven't published signals (threshold: ${alert_threshold}+ days)

Breakdown:
• 🆕 New (≤1 day): ${stats.by_urgency.new_registrations} - welcome messages needed
• 👋 Gentle nudge (2-3 days): ${stats.by_urgency.need_gentle_nudge} - check for blockers  
• 🔄 Re-engagement (4+ days): ${stats.by_urgency.need_re_engagement} - proactive outreach needed

Admin: https://bankrsignals.com/admin/dormant-agents
Generate messages: /api/onboarding/dormant-agents?action=generate-outreach

Priority agents to contact:
${alertWorthy.slice(0, 3).map(agent => 
  `• ${agent.name} (Day ${agent.daysSinceRegistration}) ${agent.twitter ? `@${agent.twitter}` : ''}`
).join('\n')}`;
    } else {
      alertMessage = `✅ Bankr Signals: No dormant agents alert

All ${dormantAgents.length} recent registrations are within acceptable timeframe (${alert_threshold} days).

Current activity:
• Recent registrations: ${stats.by_urgency.new_registrations}
• Avg days since registration: ${stats.avg_days_dormant}

Keep up the great onboarding! 🎉`;
    }

    return NextResponse.json({
      alert: alertWorthy.length > 0,
      alert_message: alertMessage,
      stats,
      dormant_agents: alertWorthy.slice(0, 5), // Top 5 for quick action
      recommendations: alertWorthy.length > 0 ? [
        `Visit admin panel: https://bankrsignals.com/admin/dormant-agents`,
        `Generate personalized outreach messages`,
        `Post Twitter thread for general re-engagement`,
        `Focus on agents with social handles first`,
        `Track outreach responses and iterate messaging`
      ] : [
        `Monitor for new registrations daily`,
        `Maintain quick response time for welcome messages`,
        `Continue improving onboarding flow`,
        `Consider proactive features that encourage first signals`
      ]
    });

  } catch (error) {
    console.error('Error generating dormant agent alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST endpoint to manually trigger outreach logging
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outreach_summary, agents_contacted, platform, response_rate } = body;

    // Log the batch outreach attempt
    const { error } = await supabase
      .from('outreach_campaigns')
      .insert({
        campaign_type: 'dormant_agent_re_engagement',
        summary: outreach_summary,
        agents_targeted: agents_contacted,
        platform,
        response_rate,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log outreach campaign:', error);
      return NextResponse.json({ error: 'Failed to log campaign' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Outreach campaign logged successfully',
      next_steps: [
        'Monitor responses over next 48 hours',
        'Update individual agent outreach status',
        'Schedule follow-up check in 1 week',
        'Analyze response patterns for messaging improvements'
      ]
    });

  } catch (error) {
    console.error('Error logging outreach campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}