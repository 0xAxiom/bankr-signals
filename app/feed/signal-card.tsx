"use client";

import { useState } from "react";
import { ExpandableReasoning, RelativeTimestamp } from "./components";

interface TradeWithProvider {
  timestamp: string;
  action: "BUY" | "SELL" | "LONG" | "SHORT";
  token: string;
  entryPrice: number;
  leverage?: number;
  txHash?: string;
  pnl?: number;
  status: "open" | "closed" | "stopped";
  collateralUsd?: number;
  amountToken?: number;
  providerName: string;
  providerAddress: string;
  confidence?: number;
  reasoning?: string;
}

interface SignalCardProps {
  trade: TradeWithProvider;
}

export function SignalCard({ trade }: SignalCardProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  
  const isBuy = trade.action === "BUY" || trade.action === "LONG";
  
  // Issue #14: Use !== undefined instead of falsy check for PnL
  const dollarPnl = trade.collateralUsd && trade.pnl !== undefined
    ? (trade.collateralUsd * (trade.pnl / 100))
    : null;

  return (
    <div className={`border-l-2 border-r border-t border-b rounded-lg p-4 bg-[#1a1a1a] hover:bg-[#222] transition-colors ${
      trade.pnl !== undefined 
        ? trade.pnl >= 0 
          ? "border-l-[rgba(34,197,94,0.6)] border-r-[#2a2a2a] border-t-[#2a2a2a] border-b-[#2a2a2a]"
          : "border-l-[rgba(239,68,68,0.6)] border-r-[#2a2a2a] border-t-[#2a2a2a] border-b-[#2a2a2a]"
        : "border-[#2a2a2a]"
    } animate-fadeIn`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              isBuy
                ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]"
                : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"
            }`}
          >
            {trade.action}
          </span>
          <span className="font-mono font-semibold text-base sm:text-lg">{trade.token}</span>
          {trade.leverage && (
            <span className="text-xs text-[#737373] bg-[#2a2a2a] px-2 py-0.5 rounded">
              {trade.leverage}x
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#737373]">
          <RelativeTimestamp timestamp={trade.timestamp} />
          <a
            href={`/provider/${trade.providerAddress}`}
            className="hover:text-[#e5e5e5] font-mono transition-colors truncate max-w-[120px] sm:max-w-none"
          >
            {trade.providerName}
          </a>
        </div>
      </div>

      {/* Issue #16: Only show confidence if real data exists */}
      {trade.confidence !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#737373]">Confidence</span>
            <span className="text-xs font-mono text-[#e5e5e5]">{trade.confidence.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[rgba(239,68,68,0.6)] via-[rgba(234,179,8,0.6)] to-[rgba(34,197,94,0.6)] rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, trade.confidence))}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs mb-3">
        <div>
          <div className="text-[#737373]">Entry</div>
          <div className="font-mono font-medium">
            ${trade.entryPrice ? trade.entryPrice.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 4 
            }) : "-"}
          </div>
        </div>
        {trade.pnl !== undefined && (
          <div>
            <div className="text-[#737373]">PnL</div>
            <div className={`font-mono font-medium ${
              trade.pnl >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"
            }`}>
              {trade.pnl > 0 ? "+" : ""}{trade.pnl.toFixed(1)}%
              {dollarPnl !== null && (
                <div className="text-xs opacity-75">
                  ${dollarPnl > 0 ? "+" : ""}{dollarPnl.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}
        <div>
          <div className="text-[#737373]">Size</div>
          <div className="font-mono">
            {trade.collateralUsd ? `$${trade.collateralUsd.toLocaleString()}` : 
             trade.amountToken ? `${trade.amountToken.toFixed(2)} ${trade.token}` : "-"}
          </div>
        </div>
        <div>
          <div className="text-[#737373]">Status</div>
          <div className={`font-mono text-xs ${
            trade.status === "closed" ? "text-[rgba(34,197,94,0.6)]" :
            trade.status === "stopped" ? "text-[rgba(239,68,68,0.6)]" :
            "text-[rgba(234,179,8,0.6)]"
          }`}>
            {trade.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Issue #16: Only show reasoning if real data exists */}
      {trade.reasoning && (
        <ExpandableReasoning 
          reasoning={trade.reasoning}
          isExpanded={isReasoningExpanded}
          onToggle={() => setIsReasoningExpanded(!isReasoningExpanded)}
        />
      )}

      {trade.txHash && (
        <div className="mt-3 pt-3 border-t border-[#2a2a2a] text-xs font-mono text-[#737373]">
          TX:{" "}
          <a
            href={`https://basescan.org/tx/${trade.txHash}`}
            target="_blank"
            rel="noopener"
            className="hover:text-[rgba(34,197,94,0.6)] transition-colors"
          >
            {trade.txHash.slice(0, 18)}…
          </a>
        </div>
      )}
    </div>
  );
}
