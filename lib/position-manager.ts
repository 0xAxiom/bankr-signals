/**
 * Position management: live PnL updates + auto-close on SL/TP
 * 
 * Works with the existing signals table schema (no extra columns needed).
 * Called by /api/cron/position-manager every 5 minutes.
 */

import { supabase } from "./db";
import { getTokenPrice, calculateUnrealizedPnl } from "./prices";

export interface PositionUpdate {
  signalId: string;
  token: string;
  action: string;
  currentPrice: number;
  entryPrice: number;
  unrealizedPnlPct: number;
  unrealizedPnlUsd: number;
  shouldClose: boolean;
  closeReason?: string;
}

/**
 * Update all open positions with current prices and auto-close if SL/TP hit.
 */
export async function updatePositionMetrics(): Promise<PositionUpdate[]> {
  try {
    // Get ALL open signals (no column filters that don't exist)
    const { data: openSignals, error } = await supabase
      .from("signals")
      .select("*")
      .eq("status", "open");

    if (error || !openSignals || openSignals.length === 0) {
      console.log("No open signals to process");
      return [];
    }

    console.log(`Processing ${openSignals.length} open signals`);

    // Get unique tokens and batch-fetch prices
    const uniqueTokens = [...new Set(openSignals.map(s => s.token))];
    const priceMap: Record<string, number> = {};

    for (const token of uniqueTokens) {
      try {
        const priceData = await getTokenPrice(token);
        if (priceData?.price) {
          priceMap[token] = priceData.price;
        }
      } catch (e) {
        console.error(`Failed to get price for ${token}:`, e);
      }
    }

    const updates: PositionUpdate[] = [];

    for (const signal of openSignals) {
      const currentPrice = priceMap[signal.token];
      if (!currentPrice) continue;

      const entryPrice = signal.entry_price;
      const leverage = signal.leverage || 1;
      const collateralUsd = signal.collateral_usd || 0;
      const stopLossPct = signal.stop_loss_pct;
      const takeProfitPct = signal.take_profit_pct;

      // Calculate unrealized PnL
      const pnlPct = calculateUnrealizedPnl(signal.action, entryPrice, currentPrice, leverage);
      const pnlUsd = collateralUsd * (pnlPct / 100);

      // Check auto-close conditions
      let shouldClose = false;
      let closeReason = "";

      // Stop loss: PnL drops below negative threshold
      if (stopLossPct && pnlPct <= -Math.abs(stopLossPct)) {
        shouldClose = true;
        closeReason = "stop_loss";
      }

      // Take profit: PnL exceeds positive threshold
      if (!shouldClose && takeProfitPct && pnlPct >= Math.abs(takeProfitPct)) {
        shouldClose = true;
        closeReason = "take_profit";
      }

      // Max age: close signals older than 48 hours
      if (!shouldClose) {
        const ageMs = Date.now() - new Date(signal.timestamp).getTime();
        if (ageMs > 48 * 60 * 60 * 1000) {
          shouldClose = true;
          closeReason = "expired_48h";
        }
      }

      const update: PositionUpdate = {
        signalId: signal.id,
        token: signal.token,
        action: signal.action,
        currentPrice,
        entryPrice,
        unrealizedPnlPct: pnlPct,
        unrealizedPnlUsd: pnlUsd,
        shouldClose,
        closeReason,
      };
      updates.push(update);

      if (shouldClose) {
        // Close the signal in DB
        const holdingMs = Date.now() - new Date(signal.timestamp).getTime();
        const holdingHours = Math.round((holdingMs / (1000 * 60 * 60)) * 10) / 10;

        await supabase
          .from("signals")
          .update({
            status: "closed",
            exit_price: currentPrice,
            exit_timestamp: new Date().toISOString(),
            pnl_pct: Math.round(pnlPct * 100) / 100,
            pnl_usd: Math.round(pnlUsd * 100) / 100,
          })
          .eq("id", signal.id);

        console.log(`Auto-closed ${signal.action} ${signal.token} (${closeReason}): ${pnlPct.toFixed(2)}% / $${pnlUsd.toFixed(2)}`);
      }
    }

    return updates;
  } catch (error) {
    console.error("Error updating position metrics:", error);
    return [];
  }
}

/**
 * Close expired signals (signals older than 48 hours with no activity)
 */
export async function closeExpiredSignals(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: expiredSignals, error } = await supabase
      .from("signals")
      .select("*")
      .eq("status", "open")
      .lt("timestamp", cutoff);

    if (error || !expiredSignals || expiredSignals.length === 0) {
      return 0;
    }

    let closedCount = 0;

    for (const signal of expiredSignals) {
      try {
        const priceData = await getTokenPrice(signal.token);
        const currentPrice = priceData?.price || signal.entry_price;
        const leverage = signal.leverage || 1;
        const pnlPct = calculateUnrealizedPnl(signal.action, signal.entry_price, currentPrice, leverage);
        const pnlUsd = (signal.collateral_usd || 0) * (pnlPct / 100);

        await supabase
          .from("signals")
          .update({
            status: "closed",
            exit_price: currentPrice,
            exit_timestamp: new Date().toISOString(),
            pnl_pct: Math.round(pnlPct * 100) / 100,
            pnl_usd: Math.round(pnlUsd * 100) / 100,
          })
          .eq("id", signal.id);

        closedCount++;
        console.log(`Expired ${signal.action} ${signal.token}: ${pnlPct.toFixed(2)}%`);
      } catch (e) {
        console.error(`Error closing expired signal ${signal.id}:`, e);
      }
    }

    return closedCount;
  } catch (error) {
    console.error("Error closing expired signals:", error);
    return 0;
  }
}

/**
 * Auto-close opposite signals when a new signal comes in
 * e.g., new SHORT closes existing LONG for same token/provider
 */
export async function checkSignalPairAutoClose(newSignal: any): Promise<void> {
  try {
    const oppositeMap: Record<string, string> = {
      SHORT: "LONG",
      LONG: "SHORT",
      SELL: "BUY",
      BUY: "SHORT",
    };

    const opposite = oppositeMap[newSignal.action];
    if (!opposite) return;

    const { data: openSignals, error } = await supabase
      .from("signals")
      .select("*")
      .eq("provider", newSignal.provider.toLowerCase())
      .eq("token", newSignal.token)
      .eq("action", opposite)
      .eq("status", "open")
      .order("timestamp", { ascending: false })
      .limit(5);

    if (error || !openSignals || openSignals.length === 0) return;

    for (const openSignal of openSignals) {
      const leverage = openSignal.leverage || 1;
      const isLong = opposite === "BUY" || opposite === "LONG";

      const pnlPct = isLong
        ? ((newSignal.entry_price - openSignal.entry_price) / openSignal.entry_price) * 100 * leverage
        : ((openSignal.entry_price - newSignal.entry_price) / openSignal.entry_price) * 100 * leverage;

      const pnlUsd = (openSignal.collateral_usd || 0) * (pnlPct / 100);

      await supabase
        .from("signals")
        .update({
          status: "closed",
          exit_price: newSignal.entry_price,
          exit_timestamp: newSignal.timestamp || new Date().toISOString(),
          exit_tx_hash: newSignal.tx_hash,
          pnl_pct: Math.round(pnlPct * 100) / 100,
          pnl_usd: Math.round(pnlUsd * 100) / 100,
        })
        .eq("id", openSignal.id);

      console.log(`Auto-closed ${opposite} ${openSignal.token} via opposite ${newSignal.action}: ${pnlPct.toFixed(2)}%`);
    }
  } catch (error) {
    console.error("Error in signal pair auto-close:", error);
  }
}
