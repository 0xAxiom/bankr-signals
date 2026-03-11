/**
 * Provider Follow System API
 * Handles following/unfollowing signal providers
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

interface FollowRequest {
  userAddress: string;
  providerAddress: string;
  action: 'follow' | 'unfollow';
}

interface FollowResponse {
  success: boolean;
  message: string;
  following?: boolean;
  followerCount?: number;
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function POST(req: NextRequest) {
  try {
    const body: FollowRequest = await req.json();
    const { userAddress, providerAddress, action } = body;

    // Validate inputs
    if (!userAddress || !providerAddress || !action) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: userAddress, providerAddress, action" },
        { status: 400 }
      );
    }

    if (!isValidAddress(userAddress) || !isValidAddress(providerAddress)) {
      return NextResponse.json(
        { success: false, message: "Invalid wallet addresses provided" },
        { status: 400 }
      );
    }

    if (!['follow', 'unfollow'].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Action must be 'follow' or 'unfollow'" },
        { status: 400 }
      );
    }

    // Can't follow yourself
    if (userAddress.toLowerCase() === providerAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if provider exists
    const { data: provider } = await supabase
      .from('signal_providers')
      .select('address, name')
      .eq('address', providerAddress.toLowerCase())
      .single();

    if (!provider) {
      return NextResponse.json(
        { success: false, message: "Provider not found" },
        { status: 404 }
      );
    }

    // Get or create user portfolio
    const { data: portfolio } = await supabase
      .from('user_portfolios')
      .select('user_id, followed_providers')
      .eq('user_id', userAddress.toLowerCase())
      .single();

    let currentFollowing: string[] = [];
    
    if (portfolio) {
      currentFollowing = portfolio.followed_providers || [];
    } else {
      // Create new user portfolio
      await supabase
        .from('user_portfolios')
        .insert({
          user_id: userAddress.toLowerCase(),
          followed_providers: [],
        });
    }

    const isCurrentlyFollowing = currentFollowing.includes(providerAddress.toLowerCase());

    if (action === 'follow') {
      if (isCurrentlyFollowing) {
        return NextResponse.json({
          success: true,
          message: `Already following ${provider.name}`,
          following: true,
        });
      }

      // Add to following list
      const newFollowing = [...currentFollowing, providerAddress.toLowerCase()];
      
      const { error } = await supabase
        .from('user_portfolios')
        .upsert({
          user_id: userAddress.toLowerCase(),
          followed_providers: newFollowing,
        });

      if (error) {
        console.error("Follow error:", error);
        return NextResponse.json(
          { success: false, message: "Failed to follow provider" },
          { status: 500 }
        );
      }

      // Update provider follower count
      await supabase.rpc('increment_follower_count', {
        provider_addr: providerAddress.toLowerCase()
      });

      return NextResponse.json({
        success: true,
        message: `Now following ${provider.name}! You'll be notified of their new signals.`,
        following: true,
      });

    } else { // unfollow
      if (!isCurrentlyFollowing) {
        return NextResponse.json({
          success: true,
          message: `Not currently following ${provider.name}`,
          following: false,
        });
      }

      // Remove from following list
      const newFollowing = currentFollowing.filter(addr => 
        addr !== providerAddress.toLowerCase()
      );
      
      const { error } = await supabase
        .from('user_portfolios')
        .update({
          followed_providers: newFollowing,
        })
        .eq('user_id', userAddress.toLowerCase());

      if (error) {
        console.error("Unfollow error:", error);
        return NextResponse.json(
          { success: false, message: "Failed to unfollow provider" },
          { status: 500 }
        );
      }

      // Update provider follower count
      await supabase.rpc('decrement_follower_count', {
        provider_addr: providerAddress.toLowerCase()
      });

      return NextResponse.json({
        success: true,
        message: `Unfollowed ${provider.name}`,
        following: false,
      });
    }

  } catch (error: any) {
    console.error("Follow API error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Get following status and list
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userAddress = searchParams.get('userAddress');
  const providerAddress = searchParams.get('providerAddress');

  if (!userAddress || !isValidAddress(userAddress)) {
    return NextResponse.json(
      { error: "Please provide a valid user address" },
      { status: 400 }
    );
  }

  try {
    if (providerAddress) {
      // Check if user follows specific provider
      const { data } = await supabase
        .from('user_portfolios')
        .select('followed_providers')
        .eq('user_id', userAddress.toLowerCase())
        .single();

      const following = data?.followed_providers?.includes(providerAddress.toLowerCase()) || false;
      
      return NextResponse.json({
        following,
        providerAddress: providerAddress.toLowerCase(),
      });
    } else {
      // Get all followed providers with their details
      const { data } = await supabase
        .from('user_portfolios')
        .select('followed_providers')
        .eq('user_id', userAddress.toLowerCase())
        .single();

      if (!data || !data.followed_providers?.length) {
        return NextResponse.json({
          following: [],
          count: 0,
        });
      }

      // Get provider details for followed addresses
      const { data: providers } = await supabase
        .from('signal_providers')
        .select('address, name, bio, avatar, twitter')
        .in('address', data.followed_providers);

      return NextResponse.json({
        following: providers || [],
        count: data.followed_providers.length,
      });
    }

  } catch (error) {
    console.error("Get following status error:", error);
    return NextResponse.json(
      { error: "Failed to get following status" },
      { status: 500 }
    );
  }
}