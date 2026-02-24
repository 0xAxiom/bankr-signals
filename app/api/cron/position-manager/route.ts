/**
 * Background job for position management
 * Call this endpoint periodically (every 5-15 minutes) to:
 * - Update position metrics
 * - Close expired signals  
 * - Auto-close positions that hit stop loss/take profit
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  updatePositionMetrics, 
  closeExpiredSignals 
} from "@/lib/position-manager";

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
    console.log("Starting position management job...");

    // Update position metrics for all open signals
    const positionUpdates = await updatePositionMetrics();
    const autoClosedPositions = positionUpdates.filter(p => p.shouldClose);

    // Close expired signals
    const expiredCount = await closeExpiredSignals();

    // Calculate some stats
    const totalProcessed = positionUpdates.length;
    const autoClosedCount = autoClosedPositions.length;
    const executionTime = Date.now() - startTime;

    const result = {
      success: true,
      stats: {
        totalPositionsProcessed: totalProcessed,
        autoClosedPositions: autoClosedCount,
        expiredSignalsClosed: expiredCount,
        executionTimeMs: executionTime,
      },
      autoClosedReasons: autoClosedPositions.reduce((acc, pos) => {
        acc[pos.closeReason || 'unknown'] = (acc[pos.closeReason || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      timestamp: new Date().toISOString(),
    };

    console.log("Position management job completed:", result.stats);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Position management job error:", error);
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
    message: "Position management cron endpoint",
    usage: "POST with proper authorization header",
    testUrl: "/api/cron/position-manager?test=true",
  });
}