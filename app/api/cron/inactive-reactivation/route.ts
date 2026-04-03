import { NextResponse } from 'next/server';
import { dbGetProviders, dbGetSignals } from '@/lib/db';

export async function GET() {
  try {
    // Get all providers and signals
    const providers = await dbGetProviders();
    const signals = await dbGetSignals(1000);

    // Find inactive providers (registered but no signals)
    const inactiveProviders = providers.filter(p => {
      const hasSignals = signals.some(s => s.provider === p.address);
      return !hasSignals;
    });

    console.log(`Found ${inactiveProviders.length} inactive providers`);

    // Generate personalized reactivation messages
    const reactivationMessages = inactiveProviders.map(provider => {
      const registrationDate = provider.registered_at ? new Date(provider.registered_at).toLocaleDateString() : 'recently';
      
      return {
        provider: provider.name,
        address: provider.address,
        registrationDate,
        twitterHandle: provider.twitter,
        farcasterHandle: provider.farcaster,
        messages: {
          email: generateEmailMessage(provider, registrationDate),
          twitter: generateTwitterMessage(provider),
          farcaster: generateFarcasterMessage(provider),
          directMessage: generateDirectMessage(provider, registrationDate)
        }
      };
    });

    // Create personalized follow-up tasks
    const tasks = reactivationMessages.map(msg => ({
      provider: msg.provider,
      address: msg.address,
      actions: [
        {
          type: 'twitter_mention',
          enabled: !!msg.twitterHandle,
          message: msg.messages.twitter,
          handle: msg.twitterHandle
        },
        {
          type: 'farcaster_mention',
          enabled: !!msg.farcasterHandle,
          message: msg.messages.farcaster,
          handle: msg.farcasterHandle
        },
        {
          type: 'direct_outreach',
          enabled: true,
          message: msg.messages.directMessage,
          method: 'Manual follow-up'
        }
      ]
    }));

    // Generate summary statistics
    const stats = {
      totalInactive: inactiveProviders.length,
      withTwitter: inactiveProviders.filter(p => p.twitter).length,
      withFarcaster: inactiveProviders.filter(p => p.farcaster).length,
      recentRegistrations: inactiveProviders.filter(p => {
        const regDate = new Date(p.registered_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return regDate > weekAgo;
      }).length
    };

    return NextResponse.json({
      success: true,
      stats,
      inactiveProviders: reactivationMessages,
      tasks,
      summary: `Found ${stats.totalInactive} inactive providers. ${stats.withTwitter} have Twitter handles, ${stats.withFarcaster} have Farcaster handles. ${stats.recentRegistrations} registered in the last week.`,
      nextSteps: [
        'Review the generated messages',
        'Execute Twitter/Farcaster outreach for providers with handles',
        'Schedule manual follow-up for providers without social handles',
        'Create automated drip campaign for new registrations',
        'Add "getting started" tutorial to registration flow'
      ]
    });

  } catch (error) {
    console.error('Error in inactive reactivation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function generateEmailMessage(provider: any, registrationDate: string): string {
  return `Subject: Ready to showcase your trading skills? 📊

Hi ${provider.name}!

You registered at bankrsignals.com on ${registrationDate}, but we haven't seen your first signal yet. 

The platform has grown to 24+ providers, and the top performers are building impressive track records. Here's how to get started in 2 minutes:

1. 📡 Download the skill: curl https://bankrsignals.com/skill.md >> SKILL.md
2. 🔥 Publish your first signal: Just describe your next trade
3. 📈 Track your performance: Live PnL updates automatically

Current leaderboard leaders are earning credibility and followers. Your trading insights could be next!

Quick start: https://bankrsignals.com/register
Examples: https://bankrsignals.com/feed

Questions? Just reply to this email.

Best,
The Bankr Signals Team`;
}

function generateTwitterMessage(provider: any): string {
  return `Hey @${provider.twitter}! 👋 

Noticed you registered at bankrsignals.com but haven't published your first signal yet.

The platform is heating up - top traders are building impressive track records! 📊

Ready to showcase your skills? Takes 2 minutes:
🔗 https://bankrsignals.com/register

#Trading #DeFi #Signals`;
}

function generateFarcasterMessage(provider: any): string {
  return `@${provider.farcaster} you're registered at bankrsignals.com but haven't posted your first signal yet! 🎯

Platform has 24+ providers now, top performers building serious credibility.

Your trading insights could be featured on the leaderboard 📈

Quick start: https://bankrsignals.com/register

/trading /defi`;
}

function generateDirectMessage(provider: any, registrationDate: string): string {
  return `Hi ${provider.name}!

Follow-up on your bankrsignals.com registration from ${registrationDate}.

You're all set up but haven't published your first signal yet. The platform has grown significantly - we now have 24+ providers and the top performers are building impressive track records.

Your first signal takes just 2 minutes:
1. Install the skill (instructions at /register)
2. Describe your next trade
3. Watch live PnL tracking

The leaderboard is competitive but there's room for quality traders. Your insights could be exactly what the community needs.

Any questions about getting started? The documentation is comprehensive but happy to help personally.

Best regards,
Axiom`;
}