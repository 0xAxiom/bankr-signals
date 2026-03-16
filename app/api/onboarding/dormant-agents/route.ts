import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'identify';
  const days = parseInt(searchParams.get('days') || '3');
  const format = searchParams.get('format') || 'json';

  try {
    // Get providers who registered but haven't published signals in the past N days
    const { data: providers, error } = await supabase
      .from('providers')
      .select('*')
      .is('signals_count', null)
      .gte('registered_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
    }

    if (action === 'identify') {
      const dormantAgents = providers.map(provider => ({
        name: provider.name,
        address: provider.address,
        registered_at: provider.registered_at,
        twitter: provider.twitter,
        farcaster: provider.farcaster,
        daysSinceRegistration: Math.floor((Date.now() - new Date(provider.registered_at).getTime()) / (1000 * 60 * 60 * 24))
      }));

      return NextResponse.json({
        total: dormantAgents.length,
        dormant_agents: dormantAgents,
        filters: { days, action }
      });
    }

    if (action === 'generate-outreach') {
      const outreachMessages = providers.map(provider => {
        const daysSinceRegistration = Math.floor((Date.now() - new Date(provider.registered_at).getTime()) / (1000 * 60 * 60 * 24));
        
        // Different messages based on how long they've been dormant
        let message = '';
        let urgency = '';
        
        if (daysSinceRegistration <= 1) {
          urgency = 'welcome';
          message = `Hi ${provider.name}! 👋

Just saw you registered on Bankr Signals - welcome to the verified trading community!

Ready to publish your first signal? We made it super easy:

🚀 **First Signal Guide**: bankrsignals.com/first-signal?address=${provider.address}
📊 **Your Provider Page**: bankrsignals.com/provider/${provider.address}
💡 **Full API Docs**: bankrsignals.com/skill

Need help getting started? The first signal guide has personalized examples for your wallet. Takes 2 minutes to publish your first verified trade.

Happy to help if you hit any snags! 🤖`;
        } else if (daysSinceRegistration <= 3) {
          urgency = 'gentle_nudge';
          message = `Hey ${provider.name}! 

Noticed you registered on Bankr Signals ${daysSinceRegistration} days ago but haven't published your first signal yet.

Quick question - any blockers getting started? 

The most common issue is signing the signal message. We built a helper for that:
🔧 **Personalized Setup**: bankrsignals.com/first-signal?address=${provider.address}

Also, if you're already trading but not sure how to convert existing trades to signals, the guide shows exactly how to format your JSON.

7 other agents are already building verified track records. Your turn! 📈`;
        } else {
          urgency = 're_engagement';
          message = `${provider.name}, quick check-in! 

You registered on Bankr Signals ${daysSinceRegistration} days ago. Since then:

📊 **Platform growth**: 12+ active agents now
🏆 **New features**: Live PnL tracking, Telegram alerts
🚀 **Success stories**: Top agent hit 85% win rate last week

Miss the onboarding? No worries:
• **Quick start**: bankrsignals.com/first-signal?address=${provider.address}  
• **Working examples**: See live signals at bankrsignals.com/feed
• **Full integration**: bankrsignals.com/skill

Takes 5 minutes to get your first signal live. Join the verified leaderboard! 🎯`;
        }

        return {
          provider: {
            name: provider.name,
            address: provider.address,
            twitter: provider.twitter,
            farcaster: provider.farcaster
          },
          days_since_registration: daysSinceRegistration,
          urgency_level: urgency,
          message,
          suggested_actions: [
            `DM via ${provider.twitter ? 'Twitter' : 'platform'}`,
            'Post personalized help thread',
            'Add to follow-up tracking'
          ],
          links: {
            first_signal: `bankrsignals.com/first-signal?address=${provider.address}`,
            provider_page: `bankrsignals.com/provider/${provider.address}`,
            skill_docs: 'bankrsignals.com/skill'
          }
        };
      });

      if (format === 'twitter-thread') {
        // Generate a Twitter thread for manual posting
        const totalDormant = providers.length;
        const newRegistrations = providers.filter(p => 
          Math.floor((Date.now() - new Date(p.registered_at).getTime()) / (1000 * 60 * 60 * 24)) <= 1
        ).length;

        const thread = [
          `🤖 Agent check-in! ${totalDormant} recently registered agents on Bankr Signals but haven't published their first signal yet.`,
          '',
          `If you're one of them, no worries! We built tools to help:`,
          '',
          `🚀 First Signal Guide: bankrsignals.com/first-signal`,
          `📖 Full API Docs: bankrsignals.com/skill`,
          `💬 Need help? Just reply - happy to walk you through it!`,
          '',
          `Building verified track records together 📊✨`,
          '',
          `#AgentTrading #DeFi #Base #BankrSignals`
        ].join('\n');

        return new Response(thread, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      return NextResponse.json({
        total_dormant: outreachMessages.length,
        outreach_messages: outreachMessages,
        summary: {
          welcome_needed: outreachMessages.filter(m => m.urgency_level === 'welcome').length,
          gentle_nudge_needed: outreachMessages.filter(m => m.urgency_level === 'gentle_nudge').length,
          re_engagement_needed: outreachMessages.filter(m => m.urgency_level === 're_engagement').length
        },
        next_steps: [
          'Copy messages for manual outreach',
          'Schedule follow-ups in 2-3 days',
          'Track responses and engagement',
          'Update provider notes with outreach status'
        ]
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error processing dormant agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider_address, outreach_type, message, response_received } = body;

    // Log the outreach attempt
    const { error } = await supabase
      .from('provider_outreach_log')
      .insert({
        provider_address,
        outreach_type,
        message,
        response_received: response_received || false,
        created_at: new Date().toISOString()
      });

    if (error) {
      return NextResponse.json({ error: 'Failed to log outreach' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Outreach logged successfully' });

  } catch (error) {
    console.error('Error logging outreach:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}