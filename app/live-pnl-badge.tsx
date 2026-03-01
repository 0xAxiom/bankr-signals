"use client";

import { useEffect, useState } from "react";

interface LivePnLBadgeProps {
  token: string;
  entryPrice: number;
  action: string;
  leverage?: number;
  status: "open" | "closed";
  pnlPct?: number; // static pnl for closed positions
  tokenAddress?: string;
  collateralUsd?: number;
  className?: string;
}

/**
 * Drop-in component that shows live PnL for open positions.
 * For closed positions, displays the static pnlPct.
 * Refreshes every 15s.
 */
export function LivePnLBadge({
  token,
  entryPrice,
  action,
  leverage = 1,
  status,
  pnlPct,
  tokenAddress,
  collateralUsd,
  className = "",
}: LivePnLBadgeProps) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(status === "open");

  useEffect(() => {
    if (status !== "open" || !entryPrice) return;

    async function fetchPrice() {
      try {
        const params = new URLSearchParams();
        if (tokenAddress) {
          params.set("addresses", tokenAddress);
        } else {
          params.set("symbols", token);
        }
        const res = await fetch(`/api/prices?${params}`);
        const data = await res.json();
        if (data.prices) {
          const key = tokenAddress
            ? tokenAddress.toLowerCase()
            : token.toUpperCase();
          const priceData = data.prices[key];
          if (priceData?.price) {
            setCurrentPrice(priceData.price);
          }
        }
      } catch {
        // keep old price
      } finally {
        setLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 15_000);
    return () => clearInterval(interval);
  }, [token, tokenAddress, entryPrice, status]);

  // Closed positions: use static PnL
  if (status === "closed") {
    const val = pnlPct ?? 0;
    const color =
      val > 0
        ? "text-[rgba(34,197,94,0.8)]"
        : val < 0
          ? "text-[rgba(239,68,68,0.8)]"
          : "text-[#999]";
    return (
      <span className={`font-mono ${color} ${className}`}>
        {val > 0 ? "+" : ""}
        {val.toFixed(2)}%
      </span>
    );
  }

  // Open positions: calculate live PnL
  if (loading) {
    return <span className={`font-mono text-[#555] animate-pulse ${className}`}>...</span>;
  }

  if (currentPrice == null || !entryPrice) {
    return <span className={`font-mono text-[#555] ${className}`}>--%</span>;
  }

  const isLong = action === "BUY" || action === "LONG";
  const priceChange = isLong
    ? (currentPrice - entryPrice) / entryPrice
    : (entryPrice - currentPrice) / entryPrice;
  const pnl = priceChange * leverage * 100;

  const color =
    pnl > 0
      ? "text-[rgba(34,197,94,0.8)]"
      : pnl < 0
        ? "text-[rgba(239,68,68,0.8)]"
        : "text-[#999]";

  const dollarPnl = collateralUsd ? collateralUsd * (pnl / 100) : null;

  return (
    <span className={`font-mono ${color} ${className}`} title={currentPrice ? `Current: $${currentPrice.toLocaleString()}` : undefined}>
      {pnl > 0 ? "+" : ""}
      {pnl.toFixed(2)}%
      {dollarPnl != null && (
        <span className="text-xs ml-1 opacity-60">
          ({dollarPnl > 0 ? "+" : ""}${dollarPnl.toFixed(2)})
        </span>
      )}
    </span>
  );
}
