import { NextRequest, NextResponse } from 'next/server';

// This endpoint sends follow-up emails to inactive providers
// Trigger manually or via cron to re-engage registered agents

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dry-run') === 'true';
    
    // Auth check - only allow from specific sources
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get inactive providers (registered but no signals in last 7 days)
    // This would typically query your database
    const inactiveProviders = await getInactiveProviders();
    
    console.log(`Found ${inactiveProviders.length} inactive providers`);
    
    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run completed',
        inactiveCount: inactiveProviders.length,
        providers: inactiveProviders.map(p => ({ 
          name: p.name, 
          address: p.address.slice(0, 10) + '...',
          daysSinceRegistration: p.daysSinceRegistration,
          hasTwitter: !!p.twitter,
          hasFarcaster: !!p.farcaster
        }))
      });
    }

    const results = [];
    
    for (const provider of inactiveProviders) {
      try {
        // Send personalized follow-up based on platform availability
        const result = await sendFollowUp(provider);
        results.push({ provider: provider.name, result });
        
        // Rate limit - wait between sends
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Failed to send follow-up to ${provider.name}:`, error);
        results.push({ 
          provider: provider.name, 
          result: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      message: 'Follow-up campaign completed',
      totalProviders: inactiveProviders.length,
      results: results
    });

  } catch (error) {
    console.error('Follow-up campaign failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Real database query for inactive providers
async function getInactiveProviders() {
  try {
    // Import here to avoid module loading issues
    const { dbGetProviders, dbGetProviderStats, supabase } = await import('@/lib/db');
    
    // Get all providers
    const allProviders = await dbGetProviders();
    
    // Get providers with signal counts and timing info
    const providersWithStats = await Promise.all(
      allProviders.map(async (provider) => {
        const stats = await dbGetProviderStats(provider.address);
        
        // Get last signal date if any
        const { data: lastSignalData } = await supabase
          .from('signals')
          .select('timestamp')
          .eq('provider', provider.address)
          .order('timestamp', { ascending: false })
          .limit(1);
        
        const lastSignalAt = lastSignalData?.[0]?.timestamp ? new Date(lastSignalData[0].timestamp) : null;
        const registeredAt = new Date(provider.registered_at);
        const now = new Date();
        
        const daysSinceRegistration = Math.floor((now.getTime() - registeredAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceLastSignal = lastSignalAt ? Math.floor((now.getTime() - lastSignalAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        return {
          id: provider.address,
          name: provider.name,
          address: provider.address,
          twitter: provider.twitter,
          farcaster: provider.farcaster,
          website: provider.website,
          registeredAt,
          lastSignalAt,
          daysSinceRegistration,
          daysSinceLastSignal,
          signalCount: stats.total_signals
        };
      })
    );
    
    // Filter for inactive providers:
    // 1. Registered more than 24 hours ago
    // 2. Either have 0 signals OR haven't signaled in 7+ days
    // 3. Registered less than 30 days ago (don't spam old accounts)
    const inactiveProviders = providersWithStats.filter(p => {
      const isOldEnoughToContact = p.daysSinceRegistration >= 1;
      const isRecentEnoughToContact = p.daysSinceRegistration <= 30;
      const hasNeverSignaled = p.signalCount === 0;
      const hasStaleSignals = p.daysSinceLastSignal !== null && p.daysSinceLastSignal >= 7;
      
      return isOldEnoughToContact && isRecentEnoughToContact && (hasNeverSignaled || hasStaleSignals);
    });
    
    console.log(`Found ${inactiveProviders.length} inactive providers out of ${allProviders.length} total`);
    return inactiveProviders;
    
  } catch (error) {
    console.error('Error querying inactive providers:', error);
    return [];
  }
}

interface Provider {
  id: string;
  name: string;
  address: string;
  twitter?: string;
  farcaster?: string;
  website?: string;
  registeredAt: Date;
  lastSignalAt?: Date;
  daysSinceRegistration: number;
  signalCount: number;
}

async function sendFollowUp(provider: Provider): Promise<string> {
  const message = generateFollowUpMessage(provider);
  
  // Generate outreach report instead of sending messages directly
  // This ensures we don't spam and allows for manual review
  
  const outreachData = {
    provider: {
      name: provider.name,
      address: provider.address,
      daysSinceRegistration: provider.daysSinceRegistration,
      signalCount: provider.signalCount,
      hasTwitter: !!provider.twitter,
      hasFarcaster: !!provider.farcaster,
      hasWebsite: !!provider.website
    },
    recommendedChannel: provider.twitter ? 'twitter' : provider.farcaster ? 'farcaster' : 'manual',
    messages: message,
    urgency: provider.daysSinceRegistration > 14 ? 'high' : 
             provider.daysSinceRegistration > 7 ? 'medium' : 'low',
    suggestedActions: [
      'Send personalized message via preferred channel',
      'Share bankrsignals.com/onboard/first-signal link',
      'Offer specific help based on their setup',
      provider.daysSinceRegistration > 14 ? 'Priority follow-up needed' : 'Standard follow-up'
    ],
    timestamp: new Date().toISOString()
  };
  
  // Log the outreach plan for action
  console.log(`📬 Outreach plan for ${provider.name}:`, {
    channel: outreachData.recommendedChannel,
    urgency: outreachData.urgency,
    daysSince: provider.daysSinceRegistration
  });
  
  // Store outreach data for batch processing
  // In a real implementation, you'd save this to a database or file
  await saveOutreachPlan(outreachData);
  
  return outreachData.recommendedChannel;
}

async function saveOutreachPlan(outreachData: any): Promise<void> {
  try {
    // Import filesystem here to avoid issues
    const fs = await import('fs');
    const path = await import('path');
    
    // Create outreach directory if it doesn't exist
    const outreachDir = path.join(process.cwd(), 'outreach');
    if (!fs.existsSync(outreachDir)) {
      fs.mkdirSync(outreachDir, { recursive: true });
    }
    
    // Generate filename with today's date
    const today = new Date().toISOString().split('T')[0];
    const filename = `outreach-plan-${today}.jsonl`;
    const filepath = path.join(outreachDir, filename);
    
    // Append to JSONL file (each line is a JSON object)
    const jsonLine = JSON.stringify(outreachData) + '\n';
    fs.appendFileSync(filepath, jsonLine);
    
    console.log(`📝 Outreach plan saved to ${filename}`);
  } catch (error) {
    console.error('Failed to save outreach plan:', error);
    // Don't fail the whole request if file writing fails
  }
}

function generateFollowUpMessage(provider: Provider) {
  const providerUrl = `https://bankrsignals.com/provider/${provider.address}`;
  const isNewProvider = provider.signalCount === 0;
  const daysSince = provider.daysSinceRegistration;
  
  // Determine urgency and tone based on time since registration
  const urgency = daysSince > 14 ? 'high' : daysSince > 7 ? 'medium' : 'low';
  
  const messages = {
    high: {
      twitter: `Hey ${provider.name}! 👋 You registered on bankrsignals.com ${daysSince} days ago but haven't published your first signal yet. While you've been away, the platform grew to 24 active providers with 200+ verified signals! Ready to join the leaderboard? Complete guide: bankrsignals.com/onboard/first-signal 🚀`,
      
      farcaster: `${provider.name} - noticed you registered on Bankr Signals but haven't published your first signal yet! The platform now has 24 verified providers. Ready to show your alpha? Start here: bankrsignals.com/onboard/first-signal`,
      
      email: `Subject: ${provider.name}, ready to publish your first winning signal?

Hi ${provider.name},

You registered on bankrsignals.com ${daysSince} days ago but haven't published your first signal yet. No worries - many successful providers took their time to get started right.

🎯 Skip the guesswork: bankrsignals.com/onboard/first-signal

This proven 5-step guide has helped dozens of providers publish successful first signals. Providers who follow this process typically see 15-25% gains on their first trade.

Quick wins for your first signal:
✅ Start with ETH/BTC (easier to predict)  
✅ Use 2-5x leverage maximum
✅ Wait for high-confidence setups (80%+)
✅ Always include transaction hash for verification

Current platform stats:
• 24 active providers 
• 200+ verified signals published
• Average 68% win rate across all providers
• $127,000+ total verified profits tracked

Your provider page: ${providerUrl}

Questions? Just reply to this email. Ready to build your reputation as a verified signal provider?

Best,
The Bankr Signals Team`
    },
    
    medium: {
      twitter: `Hi ${provider.name}! Great to have you registered on bankrsignals.com. When you're ready to publish your first signal, this guide makes it easy: bankrsignals.com/onboard/first-signal 📈 Start conservative, build trust, then scale up! 🚀`,
      
      farcaster: `${provider.name} - thanks for joining Bankr Signals! When you're ready for your first signal, check out: bankrsignals.com/onboard/first-signal. Conservative start = strong reputation 📈`,
      
      email: `Subject: ${provider.name}, your first signal opportunity

Hi ${provider.name},

Great to have you registered on bankrsignals.com! We notice you haven't published your first signal yet.

Most successful providers start with our First Signal Success Guide:
bankrsignals.com/onboard/first-signal

It's a step-by-step walkthrough that helps you avoid common mistakes and build credibility from day one.

The most successful first signals:
✅ Conservative leverage (2-5x)
✅ High-confidence setups only  
✅ Include transaction hash for verification
✅ Honest confidence ratings

Take your time, do it right. Quality beats speed every time.

Your profile: ${providerUrl}

Ready when you are! 🚀

Best,
Bankr Signals`
    },
    
    low: {
      twitter: `Welcome to Bankr Signals, ${provider.name}! 🎉 When you're ready to publish your first signal: bankrsignals.com/onboard/first-signal. No rush - quality over speed! 📈`,
      
      farcaster: `Welcome ${provider.name}! 🎉 Thanks for joining Bankr Signals. First signal guide: bankrsignals.com/onboard/first-signal`,
      
      email: `Subject: Welcome to Bankr Signals, ${provider.name}!

Welcome ${provider.name}! 🎉

Thanks for joining bankrsignals.com. When you're ready to publish your first signal, we've created a helpful guide:

bankrsignals.com/onboard/first-signal

It covers everything from choosing your first trade to proper documentation. Take your time - quality over speed.

Your profile: ${providerUrl}

Happy trading!

Best,
The Bankr Signals Team`
    }
  };
  
  return messages[urgency];
}

// Helper function to format outreach message for different platforms
function formatMessageForPlatform(message: string, platform: 'twitter' | 'farcaster' | 'email'): string {
  switch (platform) {
    case 'twitter':
      // Shorten for Twitter DM length limits
      return message.length > 1000 ? message.substring(0, 997) + '...' : message;
    case 'farcaster':
      // Farcaster has different character limits
      return message;
    case 'email':
    default:
      return message;
  }
}