import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client only if environment variables are available
let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database configuration not available' },
        { status: 503 }
      );
    }

    // Get providers who registered but haven't published signals yet
    const { data: inactiveProviders, error } = await supabase
      .from('signal_providers')
      .select('*')
      .eq('total_signals', 0)
      .order('registered_at', { ascending: false });

    // Get outreach history for these providers
    const { data: outreachData } = await supabase
      .from('outreach_attempts')
      .select('provider_address, attempt_count, last_attempt, channels_used, converted_to_signal')
      .in('provider_address', inactiveProviders?.map((p: any) => p.address) || []);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch inactive providers' }, { status: 500 });
    }

    // Create outreach lookup map
    const outreachMap = new Map();
    outreachData?.forEach((outreach: any) => {
      outreachMap.set(outreach.provider_address, outreach);
    });

    // Categorize by time since registration
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const threeDays = 3 * oneDay;
    const oneWeek = 7 * oneDay;

    const categorized = {
      recent: [],      // 0-24 hours
      followUp1: [],   // 1-3 days 
      followUp2: [],   // 3-7 days
      longTermInactive: [] // 7+ days
    };

    inactiveProviders?.forEach((provider: any) => {
      const registeredAt = new Date(provider.registered_at);
      const timeSince = now.getTime() - registeredAt.getTime();
      const outreachStatus = outreachMap.get(provider.address);
      
      const providerData = {
        ...provider,
        daysSinceRegistration: Math.floor(timeSince / oneDay),
        registrationDate: registeredAt.toISOString().split('T')[0],
        outreach: outreachStatus ? {
          attempts: outreachStatus.attempt_count,
          lastAttempt: outreachStatus.last_attempt,
          channels: outreachStatus.channels_used,
          converted: outreachStatus.converted_to_signal
        } : null
      };

      if (timeSince < oneDay) {
        categorized.recent.push(providerData);
      } else if (timeSince < threeDays) {
        categorized.followUp1.push(providerData);
      } else if (timeSince < oneWeek) {
        categorized.followUp2.push(providerData);
      } else {
        categorized.longTermInactive.push(providerData);
      }
    });

    // Calculate stats including outreach metrics
    const providersWithOutreach = inactiveProviders?.filter((p: any) => outreachMap.has(p.address)) || [];
    const stats = {
      totalInactive: inactiveProviders?.length || 0,
      needingFollowUp: categorized.followUp1.length + categorized.followUp2.length,
      longTermInactive: categorized.longTermInactive.length,
      withTwitter: inactiveProviders?.filter((p: any) => p.twitter).length || 0,
      withFarcaster: inactiveProviders?.filter((p: any) => p.farcaster).length || 0,
      outreachSent: providersWithOutreach.length,
      pendingOutreach: inactiveProviders?.filter((p: any) => 
        !outreachMap.has(p.address) && 
        (new Date().getTime() - new Date(p.registered_at).getTime()) > oneDay
      ).length || 0
    };

    // Generate action recommendations including automation
    const recommendations = [];
    
    const providersNeedingOutreach = categorized.followUp1.concat(categorized.followUp2)
      .filter((p: any) => !p.outreach || p.outreach.attempts < 2);
    
    if (providersNeedingOutreach.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Run automated outreach',
        targets: providersNeedingOutreach.length,
        description: `${providersNeedingOutreach.length} providers ready for automated follow-up via Twitter/Farcaster`
      });
    }

    const providersNeedingManualFollow = categorized.followUp2
      .filter((p: any) => p.outreach?.attempts >= 1 && !p.outreach.converted);
    
    if (providersNeedingManualFollow.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Manual outreach needed',
        targets: providersNeedingManualFollow.length,
        description: `${providersNeedingManualFollow.length} providers haven't responded to automated outreach`
      });
    }

    if (categorized.longTermInactive.length > 5) {
      const unconverted = categorized.longTermInactive
        .filter((p: any) => p.outreach && !p.outreach.converted).length;
      recommendations.push({
        priority: 'low',
        action: 'Archive or final attempt',
        targets: categorized.longTermInactive.length,
        description: `${categorized.longTermInactive.length} providers inactive 7+ days (${unconverted} had outreach attempts)`
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        categorized,
        recommendations,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error monitoring inactive providers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}