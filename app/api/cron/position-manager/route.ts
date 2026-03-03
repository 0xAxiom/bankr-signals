/**
 * Position manager cron - runs every 5 minutes
 * Updates PnL for all open signals and auto-closes on SL/TP/expiry
 */

import { NextRequest, NextResponse } from "next/server";
import { updatePositionMetrics, closeExpiredSignals } from "@/lib/position-manager";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Simple auth: Vercel crons, CRON_SECRET bearer, or POSITION_KEY query param
function isAuthorized(req: NextRequest): boolean {
  // Vercel crons set this automatically
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron) return true;

  // Bearer token
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET || process.env.POSITION_MANAGER_KEY;
  if (secret && auth === `Bearer ${secret}`) return true;

  // Query param (for easy curl testing)
  const key = new URL(req.url).searchParams.get("key");
  if (secret && key === secret) return true;

  return false;
}

async function runPositionManager() {
  const startTime = Date.now();
  console.log("Position manager starting...");

  const updates = await updatePositionMetrics();
  const expiredCount = await closeExpiredSignals();

  const autoClosed = updates.filter(u => u.shouldClose);
  const executionTime = Date.now() - startTime;

  const result = {
    success: true,
    stats: {
      openPositions: updates.length,
      autoClosed: autoClosed.length,
      expiredClosed: expiredCount,
      executionMs: executionTime,
    },
    closedDetails: autoClosed.map(u => ({
      signal: u.signalId,
      token: u.token,
      action: u.action,
      pnlPct: u.unrealizedPnlPct.toFixed(2),
      reason: u.closeReason,
    })),
    priceUpdates: updates.map(u => ({
      signal: u.signalId,
      token: u.token,
      action: u.action,
      entry: u.entryPrice,
      current: u.currentPrice,
      pnlPct: u.unrealizedPnlPct.toFixed(2),
      pnlUsd: u.unrealizedPnlUsd.toFixed(2),
    })),
    timestamp: new Date().toISOString(),
  };

  console.log(`Position manager done: ${updates.length} positions, ${autoClosed.length} closed, ${executionTime}ms`);
  return result;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPositionManager();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Position manager error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Allow GET for easy testing/calling
  if (!isAuthorized(req)) {
    return NextResponse.json({
      message: "Position manager cron",
      usage: "POST with Authorization header or GET with ?key=SECRET",
    });
  }

  try {
    const result = await runPositionManager();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Position manager error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
