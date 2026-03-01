"use client";

import { RelativeTimestamp } from "./components";
import { LivePnLBadge } from "../live-pnl-badge";

function formatMicroPrice(price: number): string {
  if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 0.01) return price.toFixed(4);
  if (price > 0) {
    const dec = price.toFixed(20).split('.')[1] || '';
    let lz = 0;
    for (const c of dec) { if (c === '0') lz++; else break; }
    return price.toFixed(lz + 4).replace(/0+$/, '');
  }
  return '0';
}

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

interface SignalCardProps {
  trade: TradeWithProvider;
}

export function SignalCard({ trade }: SignalCardProps) {
  const isBuy = trade.action === "BUY" || trade.action === "LONG";
  
  // Issue #14: Use !== undefined instead of falsy check for PnL
  const dollarPnl = trade.collateralUsd && trade.pnl != null
    ? (trade.collateralUsd * (trade.pnl / 100))
    : null;

  return (
    <div className={`border-l-2 border-r border-t border-b rounded-lg p-3 sm:p-4 bg-[#1a1a1a] hover:bg-[#222] transition-colors ${
      trade.pnl != null 
        ? trade.pnl >= 0 
          ? "border-l-[rgba(34,197,94,0.6)] border-r-[#2a2a2a] border-t-[#2a2a2a] border-b-[#2a2a2a]"
          : "border-l-[rgba(239,68,68,0.6)] border-r-[#2a2a2a] border-t-[#2a2a2a] border-b-[#2a2a2a]"
        : "border-[#2a2a2a]"
    } animate-fadeIn`}>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span
            className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 ${
              isBuy
                ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]"
                : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"
            }`}
          >
            {trade.action}
          </span>
          <span className="font-mono font-semibold text-sm sm:text-lg truncate">{trade.token}</span>
          {trade.leverage && trade.leverage > 1 && (
            <span className="text-[10px] sm:text-xs text-[#737373] bg-[#2a2a2a] px-1.5 sm:px-2 py-0.5 rounded">
              {trade.leverage}x
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[#737373] flex-shrink-0">
          <RelativeTimestamp timestamp={trade.timestamp} />
          <LivePnLBadge
            token={trade.token}
            entryPrice={trade.entryPrice}
            action={trade.action}
            leverage={trade.leverage}
            status={trade.status === "stopped" ? "closed" : trade.status}
            pnlPct={trade.pnl}
            collateralUsd={trade.collateralUsd}
            className="font-bold"
          />
        </div>
      </div>

      {/* Provider Info */}
      <div className="mb-3">
        <a
          href={`/provider/${trade.providerAddress}`}
          className="text-[10px] sm:text-xs text-[#737373] hover:text-[#e5e5e5] font-mono transition-colors"
        >
          {trade.providerName}
        </a>
      </div>

      {/* Issue #16: Only show confidence if real data exists */}
      {trade.confidence != null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#737373]">Confidence</span>
            <span className="text-xs font-mono text-[#e5e5e5]">{((trade.confidence ?? 0) * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[rgba(239,68,68,0.6)] via-[rgba(234,179,8,0.6)] to-[rgba(34,197,94,0.6)] rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (trade.confidence ?? 0) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Key Metrics - Mobile-First Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-3">
        <div>
          <div className="text-[#555] text-[10px] sm:text-xs">Entry Price</div>
          <div className="font-mono font-medium text-sm">
            ${trade.entryPrice ? formatMicroPrice(trade.entryPrice) : "-"}
          </div>
        </div>
        <div>
          <div className="text-[#555] text-[10px] sm:text-xs">Position Size</div>
          <div className="font-mono font-medium text-sm">
            {trade.collateralUsd ? `$${trade.collateralUsd.toLocaleString()}` : "-"}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-[#555] text-[10px] sm:text-xs">Status</div>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
              trade.status === "closed" ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]" :
              trade.status === "stopped" ? "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]" :
              "bg-[rgba(234,179,8,0.1)] text-[rgba(234,179,8,0.8)]"
            }`}>
              {trade.status.toUpperCase()}
            </span>
            {trade.pnl != null && dollarPnl != null && (
              <span className="text-[10px] text-[#737373] font-mono">
                ${dollarPnl > 0 ? "+" : ""}{dollarPnl.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Signal reasoning - shown prominently */}
      {trade.reasoning && (
        <div className="mt-3 bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono text-[rgba(34,197,94,0.6)] uppercase tracking-wider">Thesis</span>
          </div>
          <p className="text-xs text-[#b0b0b0] leading-relaxed">{trade.reasoning}</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-[#2a2a2a] text-xs font-mono text-[#737373] flex items-center justify-between flex-wrap gap-2">
        {trade.id && (
          <a href={`/signal/${trade.id}`} className="text-[#555] hover:text-[rgba(34,197,94,0.6)] transition-colors">
            Share ↗
          </a>
        )}
      </div>
      <div className="mt-1 text-xs font-mono text-[#737373]">
        {trade.txHash ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[rgba(34,197,94,0.6)] font-semibold">&#x2713; TX VERIFIED</span>
            <span>Entry:</span>
            <a
              href={`https://basescan.org/tx/${trade.txHash}`}
              target="_blank"
              rel="noopener"
              className="hover:text-[rgba(34,197,94,0.6)] transition-colors"
            >
              {trade.txHash.slice(0, 10)}...{trade.txHash.slice(-6)}
            </a>
            {trade.exitTxHash && (
              <>
                <span>Exit:</span>
                <a
                  href={`https://basescan.org/tx/${trade.exitTxHash}`}
                  target="_blank"
                  rel="noopener"
                  className="hover:text-[rgba(34,197,94,0.6)] transition-colors"
                >
                  {trade.exitTxHash.slice(0, 10)}...{trade.exitTxHash.slice(-6)}
                </a>
              </>
            )}
          </div>
        ) : (
          <span className="text-[#555]">UNVERIFIED - no tx hash</span>
        )}
      </div>
    </div>
  );
}
