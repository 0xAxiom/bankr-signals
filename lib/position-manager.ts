/**
 * Enhanced position management and auto-close logic for bankr-signals
 */

import { supabase } from "./db";
import { getTokenPrice, calculateUnrealizedPnl } from "./prices";
import { SignalAction, SignalStatus } from "./types";

export interface AutoCloseRule {
  signalId: string;
  stopLossPct?: number;
  takeProfitPct?: number;
  trailingStopPct?: number;
  maxHoldHours?: number;
  riskRewardRatio?: number;
}

export interface PositionUpdate {
  signalId: string;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  shouldClose: boolean;
  closeReason?: string;
  maxDrawdown?: number;
}

/**
 * Enhanced signal pair auto-close logic (BUY -> SELL, LONG -> SHORT, etc.)
 */
export async function checkSignalPairAutoClose(newSignal: any): Promise<void> {
  try {
    let oppositeAction = "";
    let lookbackDays = 30;
    
    // Define opposite signal pairs and their lookback periods
    switch (newSignal.action) {
      case "SELL":
        oppositeAction = "BUY";
        lookbackDays = 30; // Look back 30 days for BUY signals
        break;
      case "SHORT":
        oppositeAction = "LONG";
        lookbackDays = 90; // Look back 90 days for LONG positions
        break;
      case "BUY":
        // BUY can close SHORT positions (covering shorts)
        oppositeAction = "SHORT";
        lookbackDays = 90;
        break;
      default:
        return; // No auto-close for other actions
    }

    // Find matching open signals from same provider for same token
    const { data: openSignals, error } = await supabase
      .from("signals")
      .select("*")
      .eq("provider", newSignal.provider.toLowerCase())
      .eq("token", newSignal.token)
      .eq("action", oppositeAction)
      .eq("status", "open")
      .gte("timestamp", new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString())
      .order("timestamp", { ascending: false })
      .limit(5); // Limit to 5 most recent signals

    if (error || !openSignals || openSignals.length === 0) return;

    for (const openSignal of openSignals) {
      // Enhanced PnL calculation with leverage
      const leverage = openSignal.leverage || 1;
      const isLong = oppositeAction === "BUY" || oppositeAction === "LONG";
      
      let pnlPct;
      if (isLong) {
        // Long position: profit when exit price > entry price
        pnlPct = ((newSignal.entry_price - openSignal.entry_price) / openSignal.entry_price) * 100 * leverage;
      } else {
        // Short position: profit when exit price < entry price  
        pnlPct = ((openSignal.entry_price - newSignal.entry_price) / openSignal.entry_price) * 100 * leverage;
      }

      const collateralUsd = openSignal.collateral_usd || 0;
      const pnlUsd = collateralUsd * (pnlPct / 100);
      
      // Calculate holding time
      const holdingTime = new Date(newSignal.timestamp).getTime() - new Date(openSignal.timestamp).getTime();
      const holdingHours = Math.round((holdingTime / (1000 * 60 * 60)) * 10) / 10;

      // Calculate fees (estimate based on position size and leverage)
      const estimatedFeesUsd = collateralUsd * 0.001 * leverage; // 0.1% base fee * leverage
      const netPnlUsd = pnlUsd - estimatedFeesUsd;
      const netPnlPct = (netPnlUsd / collateralUsd) * 100;

      // Close the opposite signal
      await supabase
        .from("signals")
        .update({
          status: "closed",
          exit_price: newSignal.entry_price,
          exit_timestamp: newSignal.timestamp,
          exit_tx_hash: newSignal.tx_hash,
          pnl_pct: netPnlPct,
          pnl_usd: netPnlUsd,
          fees_usd: estimatedFeesUsd,
          holding_hours: holdingHours,
          updated_at: new Date().toISOString(),
          close_reason: "auto_opposite_signal",
          paired_signal_id: newSignal.id,
        })
        .eq("id", openSignal.id);

      // Also update the new signal to reference the closed signal
      await supabase
        .from("signals")
        .update({
          parent_signal_id: openSignal.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", newSignal.id);

      console.log(`Auto-closed ${oppositeAction} signal ${openSignal.id} with ${newSignal.action} signal ${newSignal.id}, Net PnL: ${netPnlPct.toFixed(2)}% (${netPnlUsd.toFixed(2)} USD)`);
      
      // Fire webhook for the closed position
      await firePositionClosedWebhook(openSignal, newSignal.entry_price, netPnlPct, netPnlUsd, "auto_opposite_signal");
    }
  } catch (error) {
    console.error("Error in enhanced signal pair auto-close:", error);
  }
}

/**
 * Update position metrics for open signals based on current prices
 */
export async function updatePositionMetrics(): Promise<PositionUpdate[]> {
  try {
    // Get all open signals
    const { data: openSignals, error } = await supabase
      .from("signals")
      .select("*")
      .eq("status", "open")
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString()); // Only non-expired signals

    if (error || !openSignals) {
      console.error("Failed to fetch open signals:", error);
      return [];
    }

    const updates: PositionUpdate[] = [];
    const uniqueTokens = [...new Set(openSignals.map(s => s.token))];
    
    // Batch fetch current prices
    const currentPrices = await Promise.all(
      uniqueTokens.map(async token => {
        const price = await getTokenPrice(token);
        return { token, price: price?.price || 0 };
      })
    );
    
    const priceMap = Object.fromEntries(currentPrices.map(p => [p.token, p.price]));

    for (const signal of openSignals) {
      const currentPrice = priceMap[signal.token];
      if (!currentPrice) continue;

      const entryPrice = signal.entry_price;
      const leverage = signal.leverage || 1;
      const collateralUsd = signal.collateral_usd || 0;

      // Calculate unrealized PnL
      const unrealizedPnlPct = calculateUnrealizedPnl(signal.action, entryPrice, currentPrice, leverage);
      const unrealizedPnlUsd = collateralUsd * (unrealizedPnlPct / 100);

      // Track max drawdown
      const currentDrawdown = Math.min(0, unrealizedPnlPct);
      const maxDrawdown = Math.min(signal.max_drawdown_pct || 0, currentDrawdown);

      // Check auto-close conditions
      let shouldClose = false;
      let closeReason = "";

      // Stop loss check
      if (signal.stop_loss_pct && Math.abs(unrealizedPnlPct) >= signal.stop_loss_pct) {
        shouldClose = true;
        closeReason = "stop_loss";
      }

      // Take profit check
      if (!shouldClose && signal.take_profit_pct && unrealizedPnlPct >= signal.take_profit_pct) {
        shouldClose = true;
        closeReason = "take_profit";
      }

      // Time-based expiry check
      if (!shouldClose && signal.expires_at) {
        const now = new Date();
        const expiresAt = new Date(signal.expires_at);
        if (now >= expiresAt) {
          shouldClose = true;
          closeReason = "expired";
        }
      }

      // Risk management: Max drawdown protection
      if (!shouldClose && maxDrawdown <= -25) { // 25% max drawdown protection
        shouldClose = true;
        closeReason = "max_drawdown";
      }

      const update: PositionUpdate = {
        signalId: signal.id,
        currentPrice,
        unrealizedPnl: unrealizedPnlUsd,
        unrealizedPnlPct,
        shouldClose,
        closeReason,
        maxDrawdown,
      };

      updates.push(update);

      // Update database with current metrics
      await supabase
        .from("signals")
        .update({
          current_price: currentPrice,
          unrealized_pnl_usd: unrealizedPnlUsd,
          unrealized_pnl_pct: unrealizedPnlPct,
          max_drawdown_pct: maxDrawdown,
          updated_at: new Date().toISOString(),
        })
        .eq("id", signal.id);

      // Auto-close if conditions are met
      if (shouldClose) {
        await autoCloseSignal(signal, currentPrice, unrealizedPnlPct, unrealizedPnlUsd, closeReason);
      }
    }

    return updates;
  } catch (error) {
    console.error("Error updating position metrics:", error);
    return [];
  }
}

/**
 * Auto-close a signal when conditions are met
 */
export async function autoCloseSignal(
  signal: any,
  exitPrice: number,
  pnlPct: number,
  pnlUsd: number,
  reason: string
): Promise<void> {
  try {
    const holdingTime = Date.now() - new Date(signal.timestamp).getTime();
    const holdingHours = holdingTime / (1000 * 60 * 60);

    await supabase
      .from("signals")
      .update({
        status: "closed",
        exit_price: exitPrice,
        exit_timestamp: new Date().toISOString(),
        pnl_pct: pnlPct,
        pnl_usd: pnlUsd,
        holding_hours: Math.round(holdingHours * 10) / 10,
        close_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signal.id);

    console.log(`Auto-closed signal ${signal.id} (${reason}): ${pnlPct.toFixed(2)}% PnL`);

    // Fire webhook for position closure
    await firePositionClosedWebhook(signal, exitPrice, pnlPct, pnlUsd, reason);
  } catch (error) {
    console.error(`Error auto-closing signal ${signal.id}:`, error);
  }
}

/**
 * Fire webhook for position closure events
 */
async function firePositionClosedWebhook(
  signal: any,
  exitPrice: number,
  pnlPct: number,
  pnlUsd: number,
  reason: string
): Promise<void> {
  try {
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("active", true);

    if (!webhooks) return;

    const payload = {
      type: "position_closed",
      signal: {
        id: signal.id,
        provider: signal.provider,
        token: signal.token,
        action: signal.action,
        entryPrice: signal.entry_price,
        exitPrice,
        pnlPct,
        pnlUsd,
        reason,
        holdingHours: Math.round((Date.now() - new Date(signal.timestamp).getTime()) / (1000 * 60 * 60) * 10) / 10,
      },
      timestamp: new Date().toISOString(),
    };

    for (const webhook of webhooks) {
      try {
        await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "BankrSignals-Webhook/2.0",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });
      } catch (error) {
        console.error(`Webhook ${webhook.id} failed:`, error);
      }
    }
  } catch (error) {
    console.error("Error firing position closed webhooks:", error);
  }
}

/**
 * Check for expired signals and close them
 */
export async function closeExpiredSignals(): Promise<number> {
  try {
    const now = new Date().toISOString();
    
    // Find expired open signals
    const { data: expiredSignals, error } = await supabase
      .from("signals")
      .select("*")
      .eq("status", "open")
      .not("expires_at", "is", null)
      .lt("expires_at", now);

    if (error || !expiredSignals) {
      return 0;
    }

    let closedCount = 0;

    for (const signal of expiredSignals) {
      try {
        // Get current price for final PnL calculation
        const priceData = await getTokenPrice(signal.token);
        const currentPrice = priceData?.price || signal.entry_price;
        
        const pnlPct = calculateUnrealizedPnl(signal.action, signal.entry_price, currentPrice, signal.leverage || 1);
        const pnlUsd = (signal.collateral_usd || 0) * (pnlPct / 100);

        await autoCloseSignal(signal, currentPrice, pnlPct, pnlUsd, "expired");
        closedCount++;
      } catch (error) {
        console.error(`Error closing expired signal ${signal.id}:`, error);
      }
    }

    if (closedCount > 0) {
      console.log(`Closed ${closedCount} expired signals`);
    }

    return closedCount;
  } catch (error) {
    console.error("Error closing expired signals:", error);
    return 0;
  }
}

/**
 * Enhanced PnL calculation with fees and slippage estimation
 */
export function calculateRealizedPnl(
  action: string,
  entryPrice: number,
  exitPrice: number,
  collateralUsd: number,
  leverage: number = 1,
  estimatedFeesUsd: number = 0,
  estimatedSlippagePct: number = 0
): { pnlPct: number; pnlUsd: number; feesUsd: number; netPnlUsd: number } {
  const isLong = action === "BUY" || action === "LONG";
  
  // Calculate gross PnL
  const priceChangePct = isLong
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100;
  
  const leveragedPnlPct = priceChangePct * leverage;
  const grossPnlUsd = collateralUsd * (leveragedPnlPct / 100);
  
  // Estimate fees if not provided
  const estimatedTradingFeesUsd = estimatedFeesUsd || (collateralUsd * 0.001); // 0.1% default fee
  
  // Estimate slippage impact
  const slippageImpactUsd = collateralUsd * (estimatedSlippagePct / 100);
  
  const totalFeesUsd = estimatedTradingFeesUsd + slippageImpactUsd;
  const netPnlUsd = grossPnlUsd - totalFeesUsd;
  const netPnlPct = (netPnlUsd / collateralUsd) * 100;

  return {
    pnlPct: netPnlPct,
    pnlUsd: netPnlUsd,
    feesUsd: totalFeesUsd,
    netPnlUsd,
  };
}

/**
 * Get portfolio-level statistics for a provider
 */
export async function getProviderPortfolioStats(providerAddress: string) {
  try {
    const { data: signals, error } = await supabase
      .from("signals")
      .select("*")
      .ilike("provider", providerAddress)
      .order("timestamp", { ascending: false });

    if (error || !signals) return null;

    const closedSignals = signals.filter(s => s.status === "closed");
    const openSignals = signals.filter(s => s.status === "open");

    // Portfolio-level calculations
    const totalCapitalDeployed = signals.reduce((sum, s) => sum + (s.collateral_usd || 0), 0);
    const totalRealizedPnl = closedSignals.reduce((sum, s) => sum + (s.pnl_usd || 0), 0);
    const totalUnrealizedPnl = openSignals.reduce((sum, s) => sum + (s.unrealized_pnl_usd || 0), 0);

    // Risk metrics
    const maxDrawdown = Math.min(...signals.map(s => s.max_drawdown_pct || 0));
    const avgHoldingTime = closedSignals.length > 0 
      ? closedSignals.reduce((sum, s) => sum + (s.holding_hours || 0), 0) / closedSignals.length
      : 0;

    // Performance metrics
    const winRate = closedSignals.length > 0
      ? (closedSignals.filter(s => (s.pnl_pct || 0) > 0).length / closedSignals.length) * 100
      : 0;

    const avgReturn = closedSignals.length > 0
      ? closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / closedSignals.length
      : 0;

    // Sharpe ratio approximation
    const returns = closedSignals.map(s => s.pnl_pct || 0);
    const avgReturnPct = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const volatility = returns.length > 1 
      ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturnPct, 2), 0) / (returns.length - 1))
      : 0;
    
    const sharpeRatio = volatility > 0 ? avgReturnPct / volatility : 0;

    return {
      totalSignals: signals.length,
      closedSignals: closedSignals.length,
      openSignals: openSignals.length,
      totalCapitalDeployed,
      totalRealizedPnl,
      totalUnrealizedPnl,
      totalPnl: totalRealizedPnl + totalUnrealizedPnl,
      winRate: Math.round(winRate),
      avgReturn: Math.round(avgReturn * 100) / 100,
      maxDrawdown,
      avgHoldingTime: Math.round(avgHoldingTime * 10) / 10,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      roi: totalCapitalDeployed > 0 ? Math.round(((totalRealizedPnl + totalUnrealizedPnl) / totalCapitalDeployed) * 10000) / 100 : 0,
    };
  } catch (error) {
    console.error("Error calculating portfolio stats:", error);
    return null;
  }
}