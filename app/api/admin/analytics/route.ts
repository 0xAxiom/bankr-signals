/**
 * Admin Analytics API
 * Provides detailed platform analytics and monitoring data
 */

import { NextRequest } from "next/server";
import { supabase } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, APIErrorCode } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Simple access control
    const adminAccess = process.env.ADMIN_ACCESS === 'true' || 
                       process.env.NODE_ENV === 'development';
    
    if (!adminAccess) {
      return createErrorResponse(APIErrorCode.AUTHORIZATION_ERROR, "Access denied", 403);
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch provider registration trends
    const { data: providerTrends, error: providerError } = await supabase
      .from("signal_providers")
      .select("address, name, created_at, signal_count")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (providerError) {
      console.error("Provider trends error:", providerError);
    }

    // Fetch signal activity by day
    const { data: signalActivity, error: signalError } = await supabase
      .from("signals")
      .select("timestamp, status, pnl_pct")
      .gte("timestamp", startDate.toISOString())
      .order("timestamp", { ascending: true });

    if (signalError) {
      console.error("Signal activity error:", signalError);
    }

    // Fetch provider performance summary
    const { data: providerPerformance, error: performanceError } = await supabase
      .from("signal_providers")
      .select(`
        address,
        name,
        signal_count,
        win_rate,
        pnl_pct,
        verified,
        created_at,
        last_signal_at
      `)
      .order("signal_count", { ascending: false });

    if (performanceError) {
      console.error("Provider performance error:", performanceError);
    }

    // Process daily signal metrics
    const dailyMetrics = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySignals = signalActivity?.filter(signal => 
        signal.timestamp.startsWith(dateStr)
      ) || [];

      const closedSignals = daySignals.filter(s => s.status === 'closed');
      const winningSignals = closedSignals.filter(s => (s.pnl_pct || 0) > 0);
      
      dailyMetrics.push({
        date: dateStr,
        totalSignals: daySignals.length,
        closedSignals: closedSignals.length,
        winningSignals: winningSignals.length,
        winRate: closedSignals.length > 0 
          ? Math.round((winningSignals.length / closedSignals.length) * 100)
          : 0,
        avgPnl: closedSignals.length > 0
          ? closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / closedSignals.length
          : 0,
      });
    }

    // Process provider growth metrics
    const providerGrowth = [];
    let cumulativeProviders = 0;
    let cumulativeActive = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count new registrations on this day
      const newProviders = providerTrends?.filter(p => 
        p.created_at.startsWith(dateStr)
      ).length || 0;
      
      cumulativeProviders += newProviders;
      
      // Count how many became active by this day
      const newActive = providerTrends?.filter(p => 
        p.created_at.startsWith(dateStr) && p.signal_count > 0
      ).length || 0;
      
      cumulativeActive += newActive;

      providerGrowth.push({
        date: dateStr,
        newProviders,
        cumulativeProviders,
        newActive,
        cumulativeActive,
        activationRate: cumulativeProviders > 0 
          ? Math.round((cumulativeActive / cumulativeProviders) * 100)
          : 0,
      });
    }

    // Token and category breakdown
    const tokenBreakdown = {};
    const categoryBreakdown = {};
    
    signalActivity?.forEach(signal => {
      // This would require token info in signals table
      // For now, just placeholder data
    });

    // Calculate key metrics
    const totalProviders = providerPerformance?.length || 0;
    const activeProviders = providerPerformance?.filter(p => p.signal_count > 0).length || 0;
    const verifiedProviders = providerPerformance?.filter(p => p.verified).length || 0;
    
    const totalSignals = signalActivity?.length || 0;
    const recentSignals = signalActivity?.filter(s => 
      new Date(s.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length || 0;

    const closedSignals = signalActivity?.filter(s => s.status === 'closed') || [];
    const overallWinRate = closedSignals.length > 0
      ? Math.round(
          (closedSignals.filter(s => (s.pnl_pct || 0) > 0).length / closedSignals.length) * 100
        )
      : 0;

    const avgPnl = closedSignals.length > 0
      ? closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / closedSignals.length
      : 0;

    const response = {
      summary: {
        totalProviders,
        activeProviders,
        verifiedProviders,
        activationRate: totalProviders > 0 ? Math.round((activeProviders / totalProviders) * 100) : 0,
        totalSignals,
        recentSignals,
        overallWinRate,
        avgPnl: Math.round(avgPnl * 100) / 100,
      },
      
      trends: {
        dailyMetrics,
        providerGrowth,
      },
      
      providers: includeInactive 
        ? providerPerformance 
        : providerPerformance?.filter(p => p.signal_count > 0),
      
      breakdown: {
        tokens: tokenBreakdown,
        categories: categoryBreakdown,
      },
      
      meta: {
        generatedAt: new Date().toISOString(),
        period: `${days} days`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }
    };

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error("Analytics error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Failed to fetch analytics data",
      500,
      { error: error.message }
    );
  }
}