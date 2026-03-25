import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userIdentifier = request.headers.get("x-user-identifier") || 
                          request.cookies.get("user_session")?.value ||
                          "anonymous";

    // Get all followed providers with their basic stats
    const { data: follows, error } = await supabase
      .from('provider_follows')
      .select(`
        provider_address,
        created_at,
        notify_telegram,
        notify_email,
        notes,
        tags,
        signal_providers!inner (
          name,
          bio,
          twitter,
          avatar
        )
      `)
      .eq('user_identifier', userIdentifier)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch following' }, { status: 500 });
    }

    // Enhance with signal stats
    const enhancedFollowing = await Promise.all(
      (follows || []).map(async (follow) => {
        try {
          // Get recent signal count (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: recentSignals, error: signalsError } = await supabase
            .from('signals')
            .select('id, pnl_pct, status')
            .eq('provider', follow.provider_address)
            .gte('created_at', thirtyDaysAgo.toISOString());

          if (signalsError) {
            console.error('Signals error:', signalsError);
          }

          // Calculate stats from recent signals
          const closedSignals = recentSignals?.filter(s => s.status === 'closed' && s.pnl_pct !== null) || [];
          const winCount = closedSignals.filter(s => s.pnl_pct && s.pnl_pct > 0).length;
          const totalPnl = closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0);

          return {
            ...follow,
            provider_name: follow.signal_providers?.name,
            provider_bio: follow.signal_providers?.bio,
            recent_signals: recentSignals?.length || 0,
            win_rate: closedSignals.length > 0 ? Math.round((winCount / closedSignals.length) * 100) : undefined,
            total_pnl: closedSignals.length > 0 ? totalPnl : undefined
          };
        } catch (error) {
          console.error(`Error enhancing follow data for ${follow.provider_address}:`, error);
          return {
            ...follow,
            provider_name: follow.signal_providers?.name,
            provider_bio: follow.signal_providers?.bio,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      following: enhancedFollowing,
      count: enhancedFollowing.length
    });

  } catch (error) {
    console.error('Following fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update following preferences
export async function PATCH(request: NextRequest) {
  try {
    const userIdentifier = request.headers.get("x-user-identifier") || 
                          request.cookies.get("user_session")?.value ||
                          "anonymous";

    const body = await request.json();
    const { provider_address, ...updates } = body;

    if (!provider_address) {
      return NextResponse.json({ error: 'provider_address required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('provider_follows')
      .update(updates)
      .eq('user_identifier', userIdentifier)
      .eq('provider_address', provider_address)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      data
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}