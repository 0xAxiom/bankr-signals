import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

interface NewProvider {
  address: string;
  name: string;
  bio?: string;
  twitter?: string;
  farcaster?: string;
  website?: string;
  registered_at: string;
  total_signals: number;
  hours_since_registration: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const execute = searchParams.get('execute') === 'true';
    const hoursThreshold = parseInt(searchParams.get('hoursThreshold') || '48'); // Default: 48 hours

    // Find recently registered providers who haven't published signals
    const cutoffDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
    
    const { data: providers, error } = await supabase
      .from('signal_providers')
      .select(`
        address,
        name, 
        bio,
        twitter,
        farcaster,
        website,
        registered_at,
        total_signals
      `)
      .gte('registered_at', cutoffDate.toISOString())
      .eq('total_signals', 0)
      .order('registered_at', { ascending: false });

    if (error) {
      console.error('Error querying new providers:', error);
      return NextResponse.json({ error: 'Failed to query providers' }, { status: 500 });
    }

    if (!providers || providers.length === 0) {
      return NextResponse.json({ 
        message: 'No providers need follow-up outreach',
        providers: []
      });
    }

    const newProviders: NewProvider[] = providers.map(p => {
      const registeredDate = new Date(p.registered_at);
      const now = new Date();
      const hoursSinceRegistration = Math.floor((now.getTime() - registeredDate.getTime()) / (1000 * 60 * 60));

      return {
        ...p,
        hours_since_registration: hoursSinceRegistration
      };
    });

    // Generate encouraging follow-up messages
    const outreachCampaigns = newProviders.map(provider => {
      const encouragingMessage = generateEncouragingMessage(provider);
      
      return {
        provider,
        twitter_dm: encouragingMessage.twitter,
        farcaster_cast: encouragingMessage.farcaster,
        quick_start_tips: encouragingMessage.tips
      };
    });

    if (execute) {
      // Log the outreach attempt
      const logEntry = {
        date: new Date().toISOString().split('T')[0],
        type: 'automated_follow_up',
        target_count: newProviders.length,
        providers: newProviders.map(p => ({
          address: p.address,
          name: p.name,
          hours_since_registration: p.hours_since_registration
        })),
        campaigns: outreachCampaigns
      };

      console.log('📬 Follow-up outreach generated:', logEntry);
      
      // In production, you'd send these messages via API
      // For now, we'll just return the templates for manual use
    }

    return NextResponse.json({
      success: true,
      providers_needing_followup: newProviders.length,
      providers: newProviders,
      outreach_campaigns: outreachCampaigns,
      stats: {
        avg_hours_since_registration: Math.round(newProviders.reduce((sum, p) => sum + p.hours_since_registration, 0) / newProviders.length),
        ready_for_outreach: newProviders.filter(p => p.hours_since_registration >= 24).length,
        very_recent: newProviders.filter(p => p.hours_since_registration < 24).length
      }
    });

  } catch (error) {
    console.error('Error in follow-up outreach cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateEncouragingMessage(provider: NewProvider) {
  const timeFrameText = provider.hours_since_registration < 24 
    ? 'yesterday' 
    : `${Math.floor(provider.hours_since_registration / 24)} days ago`;

  const encouragingTwitter = `Hey ${provider.name}! 👋 

Saw you joined Bankr Signals ${timeFrameText} - welcome to the verified trading community! 🎉

Ready to publish your first signal? It literally takes 2 minutes:

1️⃣ Go to your agent dashboard
2️⃣ Click "Publish First Signal" 
3️⃣ Add your next trade with reasoning

Your first signal gets featured on our feed! Perfect way to build initial credibility.

Need a hand getting started? Just reply - I'm here to help! 🚀

#OnchainTrading #VerifiedAlpha`;

  const encouragingFarcaster = `gm ${provider.name}! 🌅

joined bankr signals ${timeFrameText} but no signals yet 👀

your first signal gets featured on the main feed! perfect chance to make a strong first impression 💪

takes 2 min: next trade → add reasoning → publish ✨

lmk if you need help getting started 🤝`;

  const tips = [
    "🎯 Your first signal gets featured on the main feed for maximum visibility",
    "📊 Start with your next trade - don't wait for the perfect signal",
    "💡 Include your reasoning - traders follow logic, not just picks",
    "⚡ Use our Quick Publish wizard if you need step-by-step guidance",
    "🏆 Early signals often get more engagement while community is small"
  ];

  if (provider.bio) {
    if (provider.bio.includes('DeFi')) {
      tips.push("🔥 DeFi signals are in high demand right now");
    }
    if (provider.bio.includes('AI') || provider.bio.includes('ML')) {
      tips.push("🤖 AI-powered signals get extra attention from followers");
    }
    if (provider.bio.includes('Base')) {
      tips.push("⚡ Base ecosystem signals are trending - perfect timing");
    }
  }

  return {
    twitter: encouragingTwitter,
    farcaster: encouragingFarcaster,
    tips: tips.slice(0, 5)
  };
}

// Optional: Add webhook support for automated execution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider_addresses, send_immediately } = body;

    if (send_immediately && provider_addresses && provider_addresses.length > 0) {
      // This would integrate with Twitter/Farcaster APIs to send automated messages
      // For now, just return the generated templates
      
      console.log(`Would send follow-up messages to ${provider_addresses.length} providers`);
      
      return NextResponse.json({
        success: true,
        message: `Follow-up outreach prepared for ${provider_addresses.length} providers`,
        note: "Integrate with messaging APIs to send automatically"
      });
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });

  } catch (error) {
    console.error('Error in follow-up outreach POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}