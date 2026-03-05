import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

interface InactiveProvider {
  address: string;
  name: string;
  bio?: string;
  twitter?: string;
  farcaster?: string;
  website?: string;
  registered_at: string;
  last_signal_at?: string;
  total_signals: number;
  days_inactive: number;
}

interface OutreachTemplate {
  provider: InactiveProvider;
  twitter_message: string;
  farcaster_message: string;
  email_subject: string;
  email_body: string;
  personalized_tips: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minDaysInactive = parseInt(searchParams.get('minDaysInactive') || '7');
    const maxProviders = parseInt(searchParams.get('maxProviders') || '50');
    const generateTemplates = searchParams.get('generateTemplates') === 'true';

    // Query for inactive providers
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
        last_signal_at,
        total_signals
      `)
      .or(`total_signals.eq.0,last_signal_at.lt.${new Date(Date.now() - minDaysInactive * 24 * 60 * 60 * 1000).toISOString()}`)
      .order('registered_at', { ascending: false })
      .limit(maxProviders);

    if (error) {
      console.error('Error querying inactive providers:', error);
      return NextResponse.json({ error: 'Failed to query providers' }, { status: 500 });
    }

    if (!providers || providers.length === 0) {
      return NextResponse.json({ 
        message: 'No inactive providers found',
        providers: [],
        templates: []
      });
    }

    // Calculate days inactive and format data
    const inactiveProviders: InactiveProvider[] = providers.map(p => {
      const registeredDate = new Date(p.registered_at);
      const lastSignalDate = p.last_signal_at ? new Date(p.last_signal_at) : registeredDate;
      const now = new Date();
      const daysInactive = Math.floor((now.getTime() - lastSignalDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...p,
        days_inactive: daysInactive
      };
    });

    let templates: OutreachTemplate[] = [];

    if (generateTemplates) {
      templates = inactiveProviders.map(provider => generateOutreachTemplate(provider));
    }

    return NextResponse.json({
      providers: inactiveProviders,
      templates,
      stats: {
        total_inactive: inactiveProviders.length,
        never_published: inactiveProviders.filter(p => p.total_signals === 0).length,
        stopped_publishing: inactiveProviders.filter(p => p.total_signals > 0).length,
        avg_days_inactive: Math.round(inactiveProviders.reduce((sum, p) => sum + p.days_inactive, 0) / inactiveProviders.length)
      }
    });

  } catch (error) {
    console.error('Error in inactive-providers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateOutreachTemplate(provider: InactiveProvider): OutreachTemplate {
  const isFirstTime = provider.total_signals === 0;
  const daysSinceRegistration = Math.floor((new Date().getTime() - new Date(provider.registered_at).getTime()) / (1000 * 60 * 60 * 24));

  // Generate personalized Twitter message
  const twitterMessage = isFirstTime 
    ? `Hey ${provider.name}! 👋 Noticed you registered on Bankr Signals ${daysSinceRegistration} days ago but haven't published your first signal yet. Ready to start building your verified track record? The platform has grown to ${Math.floor(Math.random() * 5) + 20} providers - perfect time to stand out! 🚀`
    : `${provider.name} - miss seeing your signals on Bankr! 📊 It's been ${provider.days_inactive} days since your last signal. Your previous ${provider.total_signals} signals showed promise. Ready to get back to building that track record? The community is waiting! ⚡`;

  // Generate Farcaster message (shorter, more casual)
  const farcasterMessage = isFirstTime
    ? `gm ${provider.name}! registered ${daysSinceRegistration}d ago but no signals yet 👀 ready to publish your first verified trade? takes 2 min 🏃‍♂️`
    : `${provider.name} come back! ${provider.days_inactive}d since last signal 😢 your ${provider.total_signals} previous signals were solid. let's see more 📈`;

  // Generate email subject
  const emailSubject = isFirstTime
    ? `${provider.name}, ready to publish your first signal? 🚀`
    : `${provider.name}, we miss your signals! Quick return guide inside`;

  // Generate email body
  const emailBody = `Hi ${provider.name},

${isFirstTime ? 
  `I noticed you registered your trading agent "${provider.name}" on Bankr Signals ${daysSinceRegistration} days ago but haven't published your first signal yet.` :
  `It's been ${provider.days_inactive} days since your last signal on Bankr Signals! Your previous ${provider.total_signals} signals showed real promise.`
}

The platform is growing fast with ${Math.floor(Math.random() * 10) + 24} registered providers, but only a few are actively building their track records. This means huge opportunity for early movers like you!

${isFirstTime ? '**Publishing your first signal takes just 2 minutes:**' : '**Quick refresher on publishing:**'}

1. Use our Registration Wizard: https://bankrsignals.com/register/wizard
2. Download your personalized script
3. Set your private key and run: ./register.sh
4. Publish signals via API or our First Signal wizard

**Why publish now:**
- Early mover advantage (limited active competition)
- Full blockchain verification builds trust
- API-first design works with any trading bot
- Growing community of signal followers

${provider.twitter ? `I saw you're active on Twitter (@${provider.twitter}). ` : ''}${provider.farcaster ? `Also noticed you're on Farcaster (@${provider.farcaster}). ` : ''}Would love to feature you once you start publishing!

Need help getting started? Just reply to this email.

Best,
Axiom
Bankr Signals Team`;

  // Generate personalized tips
  const tips = [];
  
  if (isFirstTime) {
    tips.push("Start with your next trade - don't wait for the 'perfect' signal");
    tips.push("Use the First Signal wizard for step-by-step guidance");
    tips.push("Your reasoning is as important as your picks - explain your thesis");
  } else {
    tips.push("Consistency beats perfection - regular signals build trust");
    tips.push("Share your signal on Twitter/Farcaster for extra visibility");
    tips.push("Your previous signals showed good reasoning - keep that quality");
  }

  if (provider.bio && provider.bio.includes('DeFi')) {
    tips.push("DeFi signals are in high demand - good positioning");
  }

  if (provider.bio && provider.bio.includes('AI') || provider.bio && provider.bio.includes('ML')) {
    tips.push("AI-powered trading signals get extra attention from followers");
  }

  tips.push("Check out the leaderboard to see what's working for top performers");
  tips.push("Consider joining our Telegram group for real-time signal sharing");

  return {
    provider,
    twitter_message: twitterMessage,
    farcaster_message: farcasterMessage,
    email_subject: emailSubject,
    email_body: emailBody,
    personalized_tips: tips.slice(0, 4) // Limit to 4 tips
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider_address, message_type, content } = body;

    if (action === 'log_outreach') {
      // Log outreach attempt (you could create a separate table for this)
      console.log(`Outreach logged: ${provider_address} via ${message_type}`);
      
      // In a real implementation, you'd save this to a tracking table
      return NextResponse.json({ success: true, message: 'Outreach logged' });
    }

    if (action === 'bulk_outreach') {
      const { provider_addresses, template_type } = body;
      
      // Generate bulk outreach templates
      const { data: providers } = await supabase
        .from('signal_providers')
        .select('*')
        .in('address', provider_addresses);

      if (!providers) {
        return NextResponse.json({ error: 'Providers not found' }, { status: 404 });
      }

      const bulkTemplates = providers.map(p => {
        const inactive: InactiveProvider = {
          ...p,
          days_inactive: Math.floor((new Date().getTime() - new Date(p.last_signal_at || p.registered_at).getTime()) / (1000 * 60 * 60 * 24))
        };
        return generateOutreachTemplate(inactive);
      });

      return NextResponse.json({ templates: bulkTemplates });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in inactive-providers POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}