import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export async function POST() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Get inactive providers who need follow-up (1-7 days since registration, 0 signals)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inactiveProviders, error } = await supabase
      .from('signal_providers')
      .select('*')
      .eq('total_signals', 0)
      .gte('registered_at', sevenDaysAgo)
      .lte('registered_at', oneDayAgo)
      .order('registered_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Check for existing outreach attempts to avoid spam
    const { data: outreachHistory } = await supabase
      .from('outreach_attempts')
      .select('provider_address, attempt_count, last_attempt')
      .in('provider_address', inactiveProviders?.map((p: any) => p.address) || []);

    const outreachMap = new Map();
    outreachHistory?.forEach((attempt: any) => {
      outreachMap.set(attempt.provider_address, attempt);
    });

    const results = {
      processed: 0,
      twitter_sent: 0,
      farcaster_sent: 0,
      skipped: 0,
      errors: []
    };

    // Process each inactive provider
    for (const provider of inactiveProviders || []) {
      const existingOutreach = outreachMap.get(provider.address);
      const daysSinceRegistration = Math.floor(
        (Date.now() - new Date(provider.registered_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Skip if we've already sent 2+ messages or sent one recently
      if (existingOutreach?.attempt_count >= 2) {
        results.skipped++;
        continue;
      }

      const lastAttempt = existingOutreach?.last_attempt;
      if (lastAttempt && Date.now() - new Date(lastAttempt).getTime() < 48 * 60 * 60 * 1000) {
        results.skipped++;
        continue;
      }

      try {
        const outreachMessages = generateOutreachMessages(provider, daysSinceRegistration, existingOutreach?.attempt_count || 0);
        
        let twitterSent = false;
        let farcasterSent = false;

        // Send Twitter DM if available
        if (provider.twitter && outreachMessages.twitter) {
          try {
            await sendTwitterDM(provider.twitter, outreachMessages.twitter);
            twitterSent = true;
            results.twitter_sent++;
          } catch (error) {
            console.error('Twitter send failed:', error);
            results.errors.push(`Twitter failed for ${provider.name}: ${error}`);
          }
        }

        // Send Farcaster message if available  
        if (provider.farcaster && outreachMessages.farcaster) {
          try {
            await sendFarcasterMessage(provider.farcaster, outreachMessages.farcaster);
            farcasterSent = true;
            results.farcaster_sent++;
          } catch (error) {
            console.error('Farcaster send failed:', error);
            results.errors.push(`Farcaster failed for ${provider.name}: ${error}`);
          }
        }

        // Record the outreach attempt
        if (twitterSent || farcasterSent) {
          await supabase
            .from('outreach_attempts')
            .upsert({
              provider_address: provider.address,
              provider_name: provider.name,
              attempt_count: (existingOutreach?.attempt_count || 0) + 1,
              last_attempt: new Date().toISOString(),
              channels_used: [
                twitterSent ? 'twitter' : null,
                farcasterSent ? 'farcaster' : null
              ].filter(Boolean),
              message_type: existingOutreach?.attempt_count ? 'follow_up' : 'initial',
              days_since_registration: daysSinceRegistration
            });
        }

        results.processed++;
      } catch (error) {
        console.error('Processing error for provider:', provider.address, error);
        results.errors.push(`Processing failed for ${provider.name}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Automated outreach complete`,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Automated outreach error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateOutreachMessages(provider: any, daysSinceRegistration: number, attemptCount: number) {
  const isFirstAttempt = attemptCount === 0;
  const providerName = provider.name || 'there';

  if (isFirstAttempt) {
    // First outreach - friendly welcome
    return {
      twitter: `Hey ${providerName}! 👋 Saw you registered on Bankr Signals ${daysSinceRegistration} days ago. Ready to publish your first signal? We have a quick helper that generates the exact command for you: https://bankrsignals.com/first-signal

Just drop your wallet address and get personalized examples. Takes ~2 minutes to go live! 🚀`,

      farcaster: `Welcome to Bankr Signals, ${providerName}! 🎯 You registered ${daysSinceRegistration}d ago. Ready to publish your first signal?

Use our helper: https://bankrsignals.com/first-signal
→ Enter wallet address
→ Get personalized examples  
→ Copy/paste to go live

Questions? Just reply! 🤝 /trading`
    };
  } else {
    // Follow-up outreach - more direct
    return {
      twitter: `Hi ${providerName}, following up on Bankr Signals. Still interested in publishing signals? 

The platform has grown to 34 signals from active traders. Your expertise could add value to the community.

Quick start: https://bankrsignals.com/first-signal
Or need help? Just reply - I'm here to assist! 🤝`,

      farcaster: `${providerName}, checking in on your Bankr Signals registration 📊

The feed is active with traders sharing verified signals. Would love to see your trading insights there too.

Need help getting started? The first-signal helper makes it super simple: https://bankrsignals.com/first-signal

Always here if you have questions! /signals`
    };
  }
}

async function sendTwitterDM(username: string, message: string) {
  // For now, return success - in production this would integrate with Twitter API
  // TODO: Integrate with actual Twitter API when available
  console.log(`[TWITTER] Would send DM to @${username}:`, message);
  return true;
}

async function sendFarcasterMessage(username: string, message: string) {
  // For now, return success - in production this would integrate with Farcaster API
  // TODO: Integrate with actual Farcaster API when available  
  console.log(`[FARCASTER] Would send message to @${username}:`, message);
  return true;
}