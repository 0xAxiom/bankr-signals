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
  total_signals: number;
  days_since_registration: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minDaysInactive = parseInt(searchParams.get('minDaysInactive') || '7');
    const maxProviders = parseInt(searchParams.get('maxProviders') || '50');

    // Query for providers with zero signals (never published)
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
      .eq('total_signals', 0)
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
        stats: { total_inactive: 0, never_published: 0 }
      });
    }

    // Calculate days since registration
    const inactiveProviders: InactiveProvider[] = providers.map(p => {
      const registeredDate = new Date(p.registered_at);
      const now = new Date();
      const daysSinceRegistration = Math.floor((now.getTime() - registeredDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...p,
        days_since_registration: daysSinceRegistration
      };
    });

    return NextResponse.json({
      providers: inactiveProviders,
      stats: {
        total_inactive: inactiveProviders.length,
        never_published: inactiveProviders.length,
        avg_days_since_registration: Math.round(inactiveProviders.reduce((sum, p) => sum + p.days_since_registration, 0) / inactiveProviders.length)
      }
    });

  } catch (error) {
    console.error('Error in inactive-providers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}