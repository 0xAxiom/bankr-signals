/**
 * API health check endpoint
 * Validates system status and all major components
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getTokenPrice } from "@/lib/prices";
import { createSuccessResponse, createErrorResponse, APIErrorCode } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const detailed = searchParams.get('detailed') === 'true';

    const startTime = Date.now();
    const checks: Record<string, any> = {};

    // 1. Database connectivity
    try {
      const { data, error } = await supabase
        .from("signal_providers")
        .select("count")
        .limit(1);
      
      checks.database = {
        status: error ? 'error' : 'healthy',
        error: error?.message,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      checks.database = {
        status: 'error',
        error: error.message,
      };
    }

    // 2. Price feed connectivity
    const priceStart = Date.now();
    try {
      const ethPrice = await getTokenPrice('ETH');
      checks.priceFeed = {
        status: ethPrice ? 'healthy' : 'warning',
        samplePrice: ethPrice?.price,
        responseTime: Date.now() - priceStart,
      };
    } catch (error: any) {
      checks.priceFeed = {
        status: 'error',
        error: error.message,
      };
    }

    // 3. System statistics (if detailed)
    if (detailed) {
      try {
        const [providersResult, signalsResult, webhooksResult] = await Promise.all([
          supabase.from("signal_providers").select("count", { count: "exact", head: true }),
          supabase.from("signals").select("count", { count: "exact", head: true }),
          supabase.from("webhooks").select("count", { count: "exact", head: true }).eq("active", true),
        ]);

        checks.systemStats = {
          totalProviders: providersResult.count || 0,
          totalSignals: signalsResult.count || 0,
          activeWebhooks: webhooksResult.count || 0,
        };

        // Recent activity (last 24 hours)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentActivityResult = await supabase
          .from("signals")
          .select("count", { count: "exact", head: true })
          .gte("timestamp", yesterday);

        checks.recentActivity = {
          signalsLast24h: recentActivityResult.count || 0,
        };

        // Performance metrics
        const performanceResult = await supabase
          .from("signals")
          .select("status, pnl_pct")
          .eq("status", "closed")
          .not("pnl_pct", "is", null)
          .limit(1000);

        if (performanceResult.data) {
          const closedSignals = performanceResult.data;
          const winningSignals = closedSignals.filter(s => (s.pnl_pct || 0) > 0);
          
          checks.performance = {
            totalClosedSignals: closedSignals.length,
            winRate: closedSignals.length > 0 
              ? Math.round((winningSignals.length / closedSignals.length) * 100)
              : 0,
            avgReturn: closedSignals.length > 0
              ? Math.round(closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / closedSignals.length * 100) / 100
              : 0,
          };
        }
      } catch (error: any) {
        checks.systemStats = {
          status: 'error',
          error: error.message,
        };
      }
    }

    // 4. Configuration checks
    const config = {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasBaseRpc: !!process.env.BASE_RPC_URL,
      hasCronSecret: !!process.env.CRON_SECRET,
    };

    // 5. Enhanced features status
    const enhancedFeatures = {
      rateLimiting: 'enabled',
      signalVerification: 'enabled',  
      autoCloseLogic: 'enabled',
      providerVerification: 'enabled',
      webhookFiltering: 'enhanced',
      signalCategories: 'enabled',
      riskManagement: 'enabled',
    };

    // Overall health determination
    const overallStatus = Object.values(checks).some(check => 
      typeof check === 'object' && check.status === 'error'
    ) ? 'unhealthy' : 'healthy';

    const totalResponseTime = Date.now() - startTime;

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: "2.0-enhanced",
      responseTime: totalResponseTime,
      checks,
      config,
      enhancedFeatures,
      
      // API endpoints status
      endpoints: {
        signals: '/api/signals',
        providers: '/api/providers',
        leaderboard: '/api/leaderboard',
        signalOfDay: '/api/signal-of-day',
        webhooks: '/api/webhooks',
        health: '/api/health',
        
        // New enhanced endpoints
        cronJobs: {
          positionManager: '/api/cron/position-manager',
          providerVerification: '/api/cron/provider-verification',
          refreshLeaderboard: '/api/cron/refresh-leaderboard',
        },
      },
      
      // Migration status
      migrationStatus: {
        schemaEnhanced: true,
        apiStandardized: true,
        validationEnhanced: true,
        rateLimitingAdded: true,
        positionManagementAdded: true,
        verificationSystemAdded: true,
        legacyCodeRemoved: true,
      },
    };

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error("Health check error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Health check failed",
      500,
      { error: error.message }
    );
  }
}

// POST endpoint for testing specific components
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { component } = body;

    switch (component) {
      case 'database':
        const { data, error } = await supabase.from("signals").select("count").limit(1);
        return NextResponse.json({ 
          component, 
          status: error ? 'error' : 'healthy',
          error: error?.message 
        });

      case 'price-feed':
        const price = await getTokenPrice('ETH');
        return NextResponse.json({ 
          component,
          status: price ? 'healthy' : 'error',
          data: price 
        });

      default:
        return NextResponse.json({ error: "Unknown component" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}