import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse, APIErrorCode } from '@/lib/api-utils';
import { dbGetSignalsByProvider, dbGetProviders } from '@/lib/db';

// In-memory storage for development (in production this would be a database)
// Format: userId -> Set of followed provider addresses
const follows = new Map<string, Set<string>>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const feedMode = searchParams.get('feed') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!userId) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        'Missing user_id parameter',
        400
      );
    }

    // If feed mode, return signals from followed providers
    if (feedMode) {
      const feedData = await getFollowingFeed(userId, limit);
      return createSuccessResponse(feedData);
    }

    // Otherwise return list of followed providers
    const userFollows = follows.get(userId) || new Set();
    const followedProviders = Array.from(userFollows);

    return createSuccessResponse({
      userId,
      followedProviders,
      count: followedProviders.length
    });
    
  } catch (error: any) {
    console.error('GET /api/follows error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to fetch follows',
      500,
      { error: error.message }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, providerAddress } = body;
    
    if (!userId || !providerAddress) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        'Missing userId or providerAddress',
        400
      );
    }

    // Normalize the provider address
    const normalizedAddress = providerAddress.toLowerCase();
    
    // Get or create user's follows
    if (!follows.has(userId)) {
      follows.set(userId, new Set());
    }
    
    const userFollows = follows.get(userId)!;
    userFollows.add(normalizedAddress);
    
    const followedProviders = Array.from(userFollows);

    return createSuccessResponse({
      userId,
      providerAddress: normalizedAddress,
      followedProviders,
      count: followedProviders.length,
      action: 'followed'
    });
    
  } catch (error: any) {
    console.error('POST /api/follows error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to follow provider',
      500,
      { error: error.message }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, providerAddress } = body;
    
    if (!userId || !providerAddress) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        'Missing userId or providerAddress',
        400
      );
    }

    // Normalize the provider address
    const normalizedAddress = providerAddress.toLowerCase();
    
    // Get user's follows
    if (!follows.has(userId)) {
      return createErrorResponse(
        APIErrorCode.NOT_FOUND,
        'User not found',
        404
      );
    }
    
    const userFollows = follows.get(userId)!;
    userFollows.delete(normalizedAddress);
    
    const followedProviders = Array.from(userFollows);

    return createSuccessResponse({
      userId,
      providerAddress: normalizedAddress,
      followedProviders,
      count: followedProviders.length,
      action: 'unfollowed'
    });
    
  } catch (error: any) {
    console.error('DELETE /api/follows error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to unfollow provider',
      500,
      { error: error.message }
    );
  }
}

// GET endpoint for following feed - add ?feed=true to get signals from followed providers
async function getFollowingFeed(userId: string, limit = 20) {
  try {
    const userFollows = follows.get(userId) || new Set();
    
    if (userFollows.size === 0) {
      return {
        signals: [],
        followedProviders: [],
        message: "Follow some providers to see their signals here!"
      };
    }
    
    // Get signals from all followed providers
    const allSignals = [];
    const providerDetails = [];
    
    for (const providerAddress of userFollows) {
      try {
        const signals = await dbGetSignalsByProvider(providerAddress, 20);
        allSignals.push(...signals.map(s => ({ ...s, provider: providerAddress })));
      } catch (error) {
        console.warn(`Failed to get signals for provider ${providerAddress}:`, error);
      }
    }
    
    // Get provider details
    const allProviders = await dbGetProviders();
    const followedProviderDetails = allProviders.filter(p => 
      userFollows.has(p.address.toLowerCase())
    );
    
    // Sort signals by timestamp (most recent first)
    const sortedSignals = allSignals
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    
    return {
      signals: sortedSignals,
      followedProviders: followedProviderDetails,
      count: sortedSignals.length,
      totalFollowing: userFollows.size
    };
  } catch (error) {
    console.error('Error getting following feed:', error);
    throw error;
  }
}

// GET endpoint to retrieve stats about follows (for admin/analytics)
export async function HEAD(req: NextRequest) {
  try {
    const totalUsers = follows.size;
    const totalFollows = Array.from(follows.values()).reduce(
      (sum, userFollows) => sum + userFollows.size, 
      0
    );
    
    // Find most followed providers
    const providerFollowCounts = new Map<string, number>();
    for (const userFollows of follows.values()) {
      for (const provider of userFollows) {
        providerFollowCounts.set(provider, (providerFollowCounts.get(provider) || 0) + 1);
      }
    }
    
    const topProviders = Array.from(providerFollowCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([address, count]) => ({ address, followers: count }));

    return createSuccessResponse({
      stats: {
        totalUsers,
        totalFollows,
        averageFollowsPerUser: totalUsers > 0 ? Math.round(totalFollows / totalUsers * 100) / 100 : 0,
        topProviders
      }
    });
    
  } catch (error: any) {
    console.error('HEAD /api/follows error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to get follow stats',
      500,
      { error: error.message }
    );
  }
}