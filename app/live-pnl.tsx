"use client";

import { useEffect, useState } from "react";

interface OpenPosition {
  token: string;
  action: string;
  entryPrice: number;
  leverage?: number;
  collateralUsd?: number;
  timestamp: string;
  tokenAddress?: string;
}

interface LivePnLProps {
  positions: OpenPosition[];
}

interface PriceInfo {
  price: number;
  change24h: number;
}

function calcPnl(
  action: string,
  entry: number,
  current: number,
  leverage: number
): number {
  const isLong = action === "BUY" || action === "LONG";
  const change = isLong
    ? (current - entry) / entry
    : (entry - current) / entry;
  return change * leverage * 100;
}

export function LivePnLTracker({ positions }: LivePnLProps) {
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (positions.length === 0) return;

    const symbols = [...new Set(positions.filter(p => !p.tokenAddress).map((p) => p.token))].join(",");
    const addresses = [...new Set(positions.filter(p => p.tokenAddress).map((p) => p.tokenAddress!))].join(",");

    async function fetchPrices() {
      try {
        const params = new URLSearchParams();
        if (symbols) params.set("symbols", symbols);
        if (addresses) params.set("addresses", addresses);
        const res = await fetch(`/api/prices?${params}`);
        const data = await res.json();
        if (data.prices) {
          setPrices(data.prices);
          setLastUpdate(Date.now());
        }
      } catch {
        // Silently fail, keep old prices
      }
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 15_000); // Every 15s
    return () => clearInterval(interval);
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgba(34,197,94,0.6)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[rgba(34,197,94,0.8)]"></span>
          </span>
          <h3 className="text-sm font-medium text-[#e5e5e5]">
            Open Positions
          </h3>
        </div>
        {lastUpdate > 0 && (
          <span className="text-[10px] text-[#555] font-mono">
            prices update every 15s
          </span>
        )}
      </div>

      <div className="grid gap-3">
        {positions.map((pos, i) => {
          const priceData = pos.tokenAddress 
            ? prices[pos.tokenAddress.toLowerCase()] 
            : prices[pos.token.toUpperCase()];
          const currentPrice = priceData?.price;
          const leverage = pos.leverage || 1;
          const pnl =
            currentPrice != null
              ? calcPnl(pos.action, pos.entryPrice, currentPrice, leverage)
              : null;
          const dollarPnl =
            pnl != null && pos.collateralUsd
              ? pos.collateralUsd * (pnl / 100)
              : null;
          const isLong = pos.action === "BUY" || pos.action === "LONG";

          return (
            <div
              key={`${pos.token}-${pos.timestamp}-${i}`}
              className={`bg-[#1a1a1a] border rounded-lg p-4 transition-all ${
                pnl != null
                  ? pnl >= 0
                    ? "border-[rgba(34,197,94,0.3)]"
                    : "border-[rgba(239,68,68,0.3)]"
                  : "border-[#2a2a2a]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      isLong
                        ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]"
                        : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"
                    }`}
                  >
                    {pos.action}
                  </span>
                  <span className="font-mono font-semibold">{pos.token}</span>
                  {pos.leverage && pos.leverage > 1 && (
                    <span className="text-xs text-[#737373] bg-[#2a2a2a] px-2 py-0.5 rounded">
                      {pos.leverage}x
                    </span>
                  )}
                </div>

                <div className="text-right">
                  {pnl != null ? (
                    <div
                      className={`font-mono text-lg font-bold transition-colors ${
                        pnl >= 0
                          ? "text-[rgba(34,197,94,0.8)]"
                          : "text-[rgba(239,68,68,0.8)]"
                      }`}
                    >
                      {pnl > 0 ? "+" : ""}
                      {pnl.toFixed(2)}%
                    </div>
                  ) : (
                    <div className="font-mono text-lg text-[#555] animate-pulse">
                      ...
                    </div>
                  )}
                  {dollarPnl != null && (
                    <div
                      className={`text-xs font-mono ${
                        dollarPnl >= 0
                          ? "text-[rgba(34,197,94,0.5)]"
                          : "text-[rgba(239,68,68,0.5)]"
                      }`}
                    >
                      {dollarPnl > 0 ? "+" : ""}${dollarPnl.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-[#555]">Entry</div>
                  <div className="font-mono text-[#999]">
                    $
                    {pos.entryPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[#555]">Current</div>
                  <div className="font-mono text-[#e5e5e5]">
                    {currentPrice != null
                      ? `$${currentPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}`
                      : "---"}
                  </div>
                </div>
                <div>
                  <div className="text-[#555]">Size</div>
                  <div className="font-mono text-[#999]">
                    {pos.collateralUsd
                      ? `$${pos.collateralUsd.toLocaleString()}`
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
