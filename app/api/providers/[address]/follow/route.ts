import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const userAddress = request.headers.get('x-user-address') || request.nextUrl.searchParams.get('user');
    
    if (!userAddress) {
      return NextResponse.json({ following: false }, { status: 200 });
    }

    // Check if user is following this provider
    const { data: portfolio } = await supabase
      .from('user_portfolios')
      .select('followed_providers')
      .eq('user_id', userAddress.toLowerCase())
      .single();

    const isFollowing = portfolio?.followed_providers?.includes(address.toLowerCase()) || false;

    return NextResponse.json({ 
      following: isFollowing,
      provider: address.toLowerCase()
    });

  } catch (error) {
    console.error('Follow status check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check follow status',
      following: false 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const body = await request.json();
    const userAddress = request.headers.get('x-user-address') || body.userAddress;
    
    if (!userAddress) {
      return NextResponse.json({ 
        error: 'User address required' 
      }, { status: 400 });
    }

    const providerAddress = address.toLowerCase();
    const userId = userAddress.toLowerCase();

    // First, ensure the provider exists
    const { data: providerExists } = await supabase
      .from('signal_providers')
      .select('address')
      .eq('address', providerAddress)
      .single();

    if (!providerExists) {
      return NextResponse.json({ 
        error: 'Provider not found' 
      }, { status: 404 });
    }

    // Get or create user portfolio
    const { data: portfolio, error: fetchError } = await supabase
      .from('user_portfolios')
      .select('followed_providers')
      .eq('user_id', userId)
      .single();

    let currentFollows: string[] = [];
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { data: newPortfolio, error: createError } = await supabase
        .from('user_portfolios')
        .insert({
          user_id: userId,
          followed_providers: [providerAddress]
        })
        .select('followed_providers')
        .single();

      if (createError) {
        console.error('Failed to create user portfolio:', createError);
        return NextResponse.json({ 
          error: 'Failed to create user profile' 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        following: true,
        message: 'Successfully followed provider'
      });

    } else if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json({ 
        error: 'Database error' 
      }, { status: 500 });
    }

    currentFollows = portfolio?.followed_providers || [];

    // Check if already following
    if (currentFollows.includes(providerAddress)) {
      return NextResponse.json({ 
        error: 'Already following this provider',
        following: true 
      }, { status: 400 });
    }

    // Add provider to follows
    const updatedFollows = [...currentFollows, providerAddress];
    
    const { error: updateError } = await supabase
      .from('user_portfolios')
      .update({ 
        followed_providers: updatedFollows,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update follows:', updateError);
      return NextResponse.json({ 
        error: 'Failed to follow provider' 
      }, { status: 500 });
    }

    // Update provider follower count
    const { error: countError } = await supabase
      .from('signal_providers')
      .update({ 
        followers: supabase.raw('followers + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('address', providerAddress);

    if (countError) {
      console.error('Failed to update provider follower count:', countError);
      // Don't fail the request for this
    }

    return NextResponse.json({ 
      success: true, 
      following: true,
      message: 'Successfully followed provider'
    });

  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json({ 
      error: 'Failed to follow provider' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const userAddress = request.headers.get('x-user-address') || 
                       new URL(request.url).searchParams.get('user');
    
    if (!userAddress) {
      return NextResponse.json({ 
        error: 'User address required' 
      }, { status: 400 });
    }

    const providerAddress = address.toLowerCase();
    const userId = userAddress.toLowerCase();

    // Get current follows
    const { data: portfolio, error: fetchError } = await supabase
      .from('user_portfolios')
      .select('followed_providers')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return NextResponse.json({ 
        error: 'User portfolio not found' 
      }, { status: 404 });
    }

    const currentFollows: string[] = portfolio?.followed_providers || [];

    // Check if following
    if (!currentFollows.includes(providerAddress)) {
      return NextResponse.json({ 
        error: 'Not following this provider',
        following: false 
      }, { status: 400 });
    }

    // Remove provider from follows
    const updatedFollows = currentFollows.filter(addr => addr !== providerAddress);
    
    const { error: updateError } = await supabase
      .from('user_portfolios')
      .update({ 
        followed_providers: updatedFollows,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update follows:', updateError);
      return NextResponse.json({ 
        error: 'Failed to unfollow provider' 
      }, { status: 500 });
    }

    // Update provider follower count
    const { error: countError } = await supabase
      .from('signal_providers')
      .update({ 
        followers: supabase.raw('GREATEST(followers - 1, 0)'),
        updated_at: new Date().toISOString()
      })
      .eq('address', providerAddress);

    if (countError) {
      console.error('Failed to update provider follower count:', countError);
      // Don't fail the request for this
    }

    return NextResponse.json({ 
      success: true, 
      following: false,
      message: 'Successfully unfollowed provider'
    });

  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json({ 
      error: 'Failed to unfollow provider' 
    }, { status: 500 });
  }
}