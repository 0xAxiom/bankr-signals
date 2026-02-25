"use client";

import { useState, useMemo } from "react";
import { SignalCard } from "./signal-card";
import { TimeFilter } from "./time-filter";
import type { TimeFilter as TimeFilterType } from "./time-filter";

interface TradeWithProvider {
  id?: string;
  timestamp: string;
  action: "BUY" | "SELL" | "LONG" | "SHORT";
  token: string;
  entryPrice: number;
  leverage?: number;
  txHash?: string;
  exitTxHash?: string;
  pnl?: number;
  status: "open" | "closed" | "stopped";
  collateralUsd?: number;
  providerName: string;
  providerAddress: string;
  confidence?: number;
  reasoning?: string;
}

interface FilteredFeedProps {
  trades: TradeWithProvider[];
}

function filterTradesByTime(trades: TradeWithProvider[], filter: TimeFilterType): TradeWithProvider[] {
  if (filter === "all") return trades;

  const now = new Date();
  const cutoff = new Date();

  switch (filter) {
    case "today":
      cutoff.setHours(0, 0, 0, 0);
      break;
    case "week":
      cutoff.setDate(now.getDate() - 7);
      break;
    case "month":
      cutoff.setDate(now.getDate() - 30);
      break;
    default:
      return trades;
  }

  return trades.filter(trade => new Date(trade.timestamp) >= cutoff);
}

export function FilteredFeed({ trades }: FilteredFeedProps) {
  const [activeFilter, setActiveFilter] = useState<TimeFilterType>("all");

  const filteredTrades = useMemo(() => 
    filterTradesByTime(trades, activeFilter), 
    [trades, activeFilter]
  );

  // Calculate signal counts for each time period
  const signalCounts = useMemo(() => ({
    all: trades.length,
    today: filterTradesByTime(trades, "today").length,
    week: filterTradesByTime(trades, "week").length,
    month: filterTradesByTime(trades, "month").length,
  }), [trades]);

  return (
    <>
      <TimeFilter 
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        signalCounts={signalCounts}
      />

      <div className="space-y-3">
        {filteredTrades.length === 0 && activeFilter !== "all" && (
          <div className="text-center py-8">
            <p className="text-sm text-[#737373] mb-2">
              No signals found for this time period
            </p>
            <button
              onClick={() => setActiveFilter("all")}
              className="text-xs text-[#22c55e] hover:underline"
            >
              View all signals
            </button>
          </div>
        )}
        
        {filteredTrades.length === 0 && activeFilter === "all" && (
          <p className="text-sm text-[#737373]">No trades yet.</p>
        )}
        
        {filteredTrades.map((trade, i) => (
          <SignalCard key={`${trade.timestamp}-${i}`} trade={trade} />
        ))}
      </div>
    </>
  );
}