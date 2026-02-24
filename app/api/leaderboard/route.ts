import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
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
    const tier = searchParams.get("tier") as ProviderTier | null;
    const timeframe = searchParams.get("timeframe") || "all"; // all, 30d, 7d, 24h
    const sortBy = searchParams.get("sortBy") || "total_pnl"; // total_pnl, win_rate, signals, roi
    const verified = searchParams.get("verified");

    // Use materialized view for better performance
    let query = supabase
      .from("provider_leaderboard")
      .select("*")
      .limit(limit);

    // Apply filters
    if (tier && Object.values(ProviderTier).includes(tier)) {
      query = query.eq("tier", tier);
    }

    if (verified === "true") {
      query = query.eq("verified", true);
    } else if (verified === "false") {
      query = query.eq("verified", false);
    }

    // Apply sorting
    switch (sortBy) {
      case "win_rate":
        query = query.order("calculated_win_rate", { ascending: false });
        break;
      case "signals":
        query = query.order("signal_count", { ascending: false });
        break;
      case "roi":
        query = query.order("avg_roi", { ascending: false });
        break;
      case "reputation":
        query = query.order("reputation", { ascending: false });
        break;
      default:
        query = query.order("total_pnl_usd", { ascending: false });
    }

    const { data: leaderboard, error } = await query;

    if (error) {
      console.error("Leaderboard query error:", error);
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Database query failed",
        500
      );
    }

    // Calculate additional metrics and format response
    const formatted = (leaderboard || []).map((provider, index) => {
      const rankChange = provider.rank - (index + 1); // Simple rank change calculation
      
      return {
        ...dbToApiProvider(provider),
        
        // Leaderboard-specific fields
        rank: index + 1,
        rankChange,
        score: calculateLeaderboardScore(provider),
        
        // Performance metrics
        totalSignals: provider.signal_count,
        closedSignals: provider.closed_count,
        winRate: provider.calculated_win_rate,
        avgROI: provider.avg_pnl_pct,
        totalPnL: provider.total_pnl_usd,
        maxDrawdown: provider.calculated_max_drawdown,
        
        // Recent performance (placeholder - would need time-series data)
        recentPerformance: {
          winRate7d: provider.calculated_win_rate, // TODO: Calculate actual 7d metrics
          roi7d: provider.avg_pnl_pct,
          signalCount7d: Math.min(5, provider.signal_count),
        },
        
        // Enhanced fields from new schema
        tier: provider.tier,
        verified: provider.verified,
        reputation: provider.reputation,
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
          tier,
          timeframe,
          sortBy,
          verified,
          limit,
        },
        lastUpdated: new Date().toISOString(), // TODO: Get actual last refresh time
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
  const winRate = provider.calculated_win_rate || 0;
  const avgPnl = provider.avg_pnl_pct || 0;
  score += (winRate * 0.2) + (avgPnl * 2); // Win rate % + PnL impact

  // Activity component (30%)
  const signalCount = provider.signal_count || 0;
  score += Math.min(50, signalCount * 0.5); // Max 50 points for signals

  // Verification component (20%)
  const reputation = provider.reputation || 0;
  score += reputation * 0.02; // Scale reputation (0-1000) to 0-20

  // Consistency component (10%)
  if (provider.calculated_max_drawdown) {
    const drawdownPenalty = Math.abs(provider.calculated_max_drawdown) * 0.1;
    score = Math.max(0, score - drawdownPenalty);
  }

  return Math.round(score * 10) / 10;
}
