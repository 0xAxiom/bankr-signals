import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getTokenPrice, calculateUnrealizedPnl } from "@/lib/prices";

export const dynamic = "force-dynamic";

/**
 * POST /api/prices/refresh
 * Server-side endpoint to refresh prices for all open positions
 * and update their live PnL. This ensures PnL updates aren't
 * dependent on client-side fetching alone.
 */
export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now();

    // Get all open signals that need price updates
    const { data: openSignals, error } = await supabase
      .from("signals")
      .select("id, token, token_address, entry_price, action, leverage, collateral_usd")
      .eq("status", "open")
      .not("entry_price", "is", null);

    if (error) {
      console.error("Error fetching open signals:", error);
      return NextResponse.json({ error: "Failed to fetch open signals" }, { status: 500 });
    }

    if (!openSignals || openSignals.length === 0) {
      return NextResponse.json({ 
        message: "No open signals to refresh",
        processedSignals: 0,
        duration: Date.now() - startTime
      });
    }

    // Get unique tokens/addresses to fetch prices for
    const uniqueTokens = new Set<string>();
    const uniqueAddresses = new Set<string>();

    for (const signal of openSignals) {
      if (signal.token_address) {
        uniqueAddresses.add(signal.token_address.toLowerCase());
      } else {
        uniqueTokens.add(signal.token.toUpperCase());
      }
    }

    // Fetch all prices in parallel
    const pricePromises: Promise<{ key: string; price: number | null }>[] = [];
    
    for (const token of uniqueTokens) {
      pricePromises.push(
        getTokenPrice(token).then(result => ({
          key: token,
          price: result?.price || null
        }))
      );
    }

    for (const address of uniqueAddresses) {
      pricePromises.push(
        getTokenPrice(address).then(result => ({
          key: address,
          price: result?.price || null
        }))
      );
    }

    const priceResults = await Promise.allSettled(pricePromises);
    const prices: Record<string, number> = {};

    priceResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.price !== null) {
        prices[result.value.key] = result.value.price;
      }
    });

    // Calculate live PnL for each signal and batch update
    const updates: Array<{ 
      id: string; 
      unrealized_pnl_pct: number; 
      unrealized_pnl_usd: number;
      current_price: number;
      updated_at: string 
    }> = [];

    for (const signal of openSignals) {
      const priceKey = signal.token_address 
        ? signal.token_address.toLowerCase() 
        : signal.token.toUpperCase();
      
      const currentPrice = prices[priceKey];
      
      if (currentPrice && signal.entry_price) {
        const leverage = Number(signal.leverage) || 1;
        const pnlPct = calculateUnrealizedPnl(
          signal.action, 
          Number(signal.entry_price), 
          currentPrice, 
          leverage
        );
        
        const pnlUsd = signal.collateral_usd 
          ? Number(signal.collateral_usd) * (pnlPct / 100)
          : 0;

        updates.push({
          id: signal.id,
          unrealized_pnl_pct: pnlPct,
          unrealized_pnl_usd: pnlUsd,
          current_price: currentPrice,
          updated_at: new Date().toISOString()
        });
      }
    }

    // Batch update all signals with new PnL data
    const updatePromises = updates.map(update =>
      supabase
        .from("signals")
        .update({
          unrealized_pnl_pct: update.unrealized_pnl_pct,
          unrealized_pnl_usd: update.unrealized_pnl_usd,
          current_price: update.current_price,
          updated_at: update.updated_at
        })
        .eq("id", update.id)
    );

    const updateResults = await Promise.allSettled(updatePromises);
    const successfulUpdates = updateResults.filter(r => r.status === 'fulfilled').length;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      message: "Price refresh completed",
      processedSignals: openSignals.length,
      pricesFetched: Object.keys(prices).length,
      signalsUpdated: successfulUpdates,
      duration,
      updatedSignals: updates.map(u => ({ 
        id: u.id, 
        pnlPct: u.unrealized_pnl_pct.toFixed(2) + '%',
        pnlUsd: '$' + u.unrealized_pnl_usd.toFixed(2)
      }))
    });

  } catch (error: any) {
    console.error("Price refresh error:", error);
    return NextResponse.json(
      { error: "Price refresh failed", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/prices/refresh
 * Check when prices were last refreshed and show summary
 */
export async function GET(req: NextRequest) {
  try {
    const { data: signals, error } = await supabase
      .from("signals")
      .select("id, token, updated_at, unrealized_pnl_pct, unrealized_pnl_usd")
      .eq("status", "open")
      .not("updated_at", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch price update status" }, { status: 500 });
    }

    const now = Date.now();
    const recentlyUpdated = signals?.filter(s => 
      s.updated_at && 
      (now - new Date(s.updated_at).getTime()) < 5 * 60 * 1000 // 5 minutes
    ) || [];

    return NextResponse.json({
      openSignals: signals?.length || 0,
      recentlyUpdated: recentlyUpdated.length,
      lastUpdate: signals?.[0]?.updated_at || null,
      sampleUpdatedSignals: signals?.slice(0, 5).map(s => ({
        id: s.id,
        token: s.token,
        lastUpdate: s.updated_at,
        livePnl: s.unrealized_pnl_pct ? `${s.unrealized_pnl_pct.toFixed(2)}%` : 'N/A'
      })) || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}