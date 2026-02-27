import { NextRequest, NextResponse } from "next/server";
import { dbGetLeaderboard } from "@/lib/db";
import {
  createSuccessResponse,
  createErrorResponse,
  APIErrorCode,
  dbToApiProvider,
} from "@/lib/api-utils";
import { ProviderTier } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const sortBy = searchParams.get("sortBy") || "total_pnl"; // total_pnl, win_rate, signals, roi

    // Get leaderboard data from existing function
    const leaderboard = await dbGetLeaderboard();

    if (!leaderboard) {
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Failed to fetch leaderboard data",
        500
      );
    }

    // Apply sorting
    let sortedLeaderboard = [...leaderboard];
    switch (sortBy) {
      case "win_rate":
        sortedLeaderboard.sort((a, b) => b.win_rate - a.win_rate);
        break;
      case "signals":
        sortedLeaderboard.sort((a, b) => b.total_signals - a.total_signals);
        break;
      case "roi":
        sortedLeaderboard.sort((a, b) => b.avg_pnl_pct - a.avg_pnl_pct);
        break;
      default:
        sortedLeaderboard.sort((a, b) => b.total_pnl_usd - a.total_pnl_usd);
    }

    // Apply limit
    const limitedLeaderboard = sortedLeaderboard.slice(0, limit);

    // Calculate additional metrics and format response
    const formatted = limitedLeaderboard.map((provider, index) => {
      return {
        ...dbToApiProvider(provider),
        
        // Leaderboard-specific fields
        rank: index + 1,
        rankChange: 0, // Simple placeholder
        score: calculateLeaderboardScore(provider),
        
        // Performance metrics  
        totalSignals: provider.total_signals,
        closedSignals: provider.wins + provider.losses,
        winRate: provider.win_rate,
        avgROI: provider.avg_pnl_pct,
        totalPnL: provider.total_pnl_usd,
        openPositions: provider.open_positions,
        
        // Recent performance (placeholder - would need time-series data)
        recentPerformance: {
          winRate7d: provider.win_rate, // TODO: Calculate actual 7d metrics
          roi7d: provider.avg_pnl_pct,
          signalCount7d: Math.min(5, provider.total_signals),
        },
        
        // Basic fields (will be null for existing providers)
        tier: provider.tier || ProviderTier.BASIC,
        verified: provider.verified || false,
        reputation: provider.reputation || 0,
        badges: provider.badges || [],
        specialties: provider.specialties || [],
      };
    });

    // Calculate summary statistics
    const summary = {
      totalProviders: formatted.length,
      verifiedProviders: formatted.filter(p => p.verified).length,
      avgWinRate: formatted.length > 0 
        ? formatted.reduce((sum, p) => sum + (p.winRate || 0), 0) / formatted.length
        : 0,
      totalVolume: formatted.reduce((sum, p) => sum + (p.totalPnL || 0), 0),
      topTiers: {
        institutional: formatted.filter(p => p.tier === ProviderTier.INSTITUTIONAL).length,
        premium: formatted.filter(p => p.tier === ProviderTier.PREMIUM).length,
        verified: formatted.filter(p => p.tier === ProviderTier.VERIFIED).length,
        basic: formatted.filter(p => p.tier === ProviderTier.BASIC).length,
      },
    };

    return createSuccessResponse(
      {
        leaderboard: formatted,
        summary,
        filters: {
          sortBy,
          limit,
        },
        lastUpdated: new Date().toISOString(),
      }
    );
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Internal server error",
      500
    );
  }
}

/**
 * Calculate composite leaderboard score
 */
function calculateLeaderboardScore(provider: any): number {
  let score = 0;

  // Performance component (40%)
  const winRate = provider.win_rate || 0;
  const avgPnl = provider.avg_pnl_pct || 0;
  score += (winRate * 0.4) + (avgPnl * 0.1); // Win rate % + PnL impact

  // Activity component (30%)
  const signalCount = provider.total_signals || 0;
  score += Math.min(30, signalCount * 0.5); // Max 30 points for signals

  // Volume component (20%)
  const totalPnl = Math.abs(provider.total_pnl_usd || 0);
  score += Math.min(20, totalPnl * 0.01); // $1 PnL = 0.01 points, max 20

  // Consistency component (10%)
  const closedSignals = provider.wins + provider.losses;
  if (closedSignals >= 3) { // Only penalize with enough sample size
    const consistency = closedSignals > 0 ? (provider.wins / closedSignals) : 0;
    score += consistency * 10; // 0-10 points for consistency
  }

  return Math.round(score * 10) / 10;
}
