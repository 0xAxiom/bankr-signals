/**
 * Background job to refresh the materialized leaderboard view
 * Call this endpoint periodically (every 15-30 minutes) to update leaderboard rankings
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    console.log("Starting leaderboard refresh job...");

    // Refresh the materialized view
    const { error } = await supabase.rpc('refresh_provider_leaderboard');

    if (error) {
      throw new Error(`Failed to refresh leaderboard: ${error.message}`);
    }

    // Get count of providers in leaderboard
    const { count } = await supabase
      .from("provider_leaderboard")
      .select("*", { count: "exact", head: true });

    const executionTime = Date.now() - startTime;

    const result = {
      success: true,
      stats: {
        providersInLeaderboard: count || 0,
        executionTimeMs: executionTime,
      },
      timestamp: new Date().toISOString(),
    };

    console.log("Leaderboard refresh job completed:", result.stats);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Leaderboard refresh job error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
      }, 
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const test = searchParams.get('test');
  
  if (test === 'true') {
    // Allow manual testing without auth
    return POST(req);
  }
  
  return NextResponse.json({
    message: "Leaderboard refresh cron endpoint",
    usage: "POST with proper authorization header",
    testUrl: "/api/cron/refresh-leaderboard?test=true",
  });
}