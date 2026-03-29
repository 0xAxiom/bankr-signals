import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userAddress = request.headers.get('x-user-address');
    
    if (!userAddress) {
      return NextResponse.json({ 
        count: 0,
        providers: []
      });
    }

    const userId = userAddress.toLowerCase();

    // Get user's followed providers
    const { data: portfolio, error: portfolioError } = await supabase
      .from('user_portfolios')
      .select('followed_providers')
      .eq('user_id', userId)
      .single();

    if (portfolioError || !portfolio?.followed_providers) {
      return NextResponse.json({ 
        count: 0,
        providers: []
      });
    }

    const followedProviders = portfolio.followed_providers || [];

    return NextResponse.json({ 
      count: followedProviders.length,
      providers: followedProviders
    });

  } catch (error) {
    console.error('Follow count API error:', error);
    return NextResponse.json({ 
      count: 0,
      providers: [],
      error: 'Failed to fetch follow count'
    });
  }
}