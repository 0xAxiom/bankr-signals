"use client";

import { useState } from "react";
import { ProviderStats, ParsedTrade } from "@/lib/signals";
import { Avatar } from "./avatar";

interface LiveTickerProps {
  trades: (ParsedTrade & { providerName: string; providerAddress: string })[];
}

export function LiveTicker({ trades }: LiveTickerProps) {
  if (trades.length === 0) return null;
  
  const latestTrade = trades[0];
  const isBuy = latestTrade.action === "BUY" || latestTrade.action === "LONG";
  
  return (
    <div className="bg-[#1a1a1a] border-l-2 border-r border-t border-b border-l-[rgba(34,197,94,0.4)] border-r-[#2a2a2a] border-t-[#2a2a2a] border-b-[#2a2a2a] rounded px-3 sm:px-4 py-2 mb-8 animate-pulse">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
        <span className="text-[rgba(34,197,94,0.6)] font-mono font-bold">● LIVE</span>
        <span
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
            isBuy
              ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]"
              : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"
          }`}
        >
          {latestTrade.action}
        </span>
        <span className="font-mono font-semibold">{latestTrade.token}</span>
        <span className="text-[#737373]">@</span>
        <span className="font-mono">${latestTrade.entryPrice.toLocaleString()}</span>
        {latestTrade.leverage && (
          <>
            <span className="text-[#737373] hidden sm:inline">·</span>
            <span className="text-xs bg-[#2a2a2a] px-2 py-0.5 rounded">{latestTrade.leverage}x</span>
          </>
        )}
        <span className="text-[#737373]">by</span>
        <a 
          href={`/provider/${latestTrade.providerAddress}`} 
          className="font-mono text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.8)] transition-colors truncate max-w-[120px] sm:max-w-none"
        >
          {latestTrade.providerName}
        </a>
      </div>
    </div>
  );
}

interface AggregateEquityCurveProps {
  providers: ProviderStats[];
}

export function AggregateEquityCurve({ providers }: AggregateEquityCurveProps) {
  const allTrades = providers.flatMap(p => p.trades);
  
  if (allTrades.length === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-sm font-medium text-[#e5e5e5] mb-4">Aggregate Performance</h3>
        <div className="w-full h-24 flex items-center justify-center text-xs text-[#737373]">
          No trade data available
        </div>
      </div>
    );
  }

  // Sort all trades by timestamp and calculate cumulative PnL
  const sortedTrades = allTrades
    .filter(t => t.pnl !== undefined)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const equityPoints: { date: Date; pnl: number }[] = [];
  let runningPnl = 0;

  sortedTrades.forEach(trade => {
    runningPnl += trade.pnl || 0;
    equityPoints.push({
      date: new Date(trade.timestamp),
      pnl: runningPnl
    });
  });

  if (equityPoints.length === 0) return null;

  const minPnL = Math.min(0, ...equityPoints.map(p => p.pnl));
  const maxPnL = Math.max(...equityPoints.map(p => p.pnl));
  const range = maxPnL - minPnL || 1;
  
  const width = 300;
  const height = 80;
  const padding = 10;
  
  const pathData = equityPoints
    .map((point, i) => {
      const x = padding + (i / Math.max(1, equityPoints.length - 1)) * (width - padding * 2);
      const y = padding + ((maxPnL - point.pnl) / range) * (height - padding * 2);
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    })
    .join(" ");

  const isPositive = equityPoints[equityPoints.length - 1].pnl >= 0;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#e5e5e5]">Ecosystem Performance</h3>
        <div className="text-xs text-[#737373]">
          Total: <span className={`font-mono ${isPositive ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}`}>
            {isPositive ? "+" : ""}{equityPoints[equityPoints.length - 1].pnl.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-16 sm:h-20">
        {/* Zero line */}
        {minPnL < 0 && (
          <line
            x1={padding}
            y1={padding + ((maxPnL - 0) / range) * (height - padding * 2)}
            x2={width - padding}
            y2={padding + ((maxPnL - 0) / range) * (height - padding * 2)}
            stroke="rgba(115, 115, 115, 0.2)"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        )}
        
        {/* Equity curve */}
        <path
          d={pathData}
          fill="none"
          stroke={isPositive ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)"}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Fill area */}
        <path
          d={`${pathData} L${width - padding},${height - padding} L${padding},${height - padding} Z`}
          fill={isPositive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)"}
        />
      </svg>
      
      <div className="text-xs text-[#737373] mt-2 text-center">
        {sortedTrades.length} trades across {providers.length} providers
      </div>
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Trade",
      description: "Bankr agents execute trades on-chain with full transparency"
    },
    {
      number: "2", 
      title: "Signal",
      description: "Every trade becomes a verified signal with TX hash proof"
    },
    {
      number: "3",
      title: "Copy",
      description: "Subscribers auto-copy signals or poll API for updates"
    }
  ];

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 sm:p-8 mb-16">
      <h3 className="text-lg font-semibold mb-6 text-center">How It Works</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        {steps.map((step, i) => (
          <div key={step.number} className="text-center relative">
            {i < steps.length - 1 && (
              <div className="hidden sm:block absolute top-6 right-0 w-full h-0.5 bg-gradient-to-r from-[rgba(34,197,94,0.6)] to-transparent transform translate-x-1/2"></div>
            )}
            
            <div className="w-12 h-12 bg-[rgba(34,197,94,0.1)] border-2 border-[rgba(34,197,94,0.6)] rounded-full flex items-center justify-center font-mono font-bold text-[rgba(34,197,94,0.8)] text-lg mx-auto mb-4 relative z-10">
              {step.number}
            </div>
            
            <h4 className="font-semibold mb-2">{step.title}</h4>
            <p className="text-xs text-[#737373] leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SortableProvidersTableProps {
  providers: ProviderStats[];
  showAll?: boolean;
}

type SortField = "pnl_pct" | "win_rate" | "signal_count" | "avg_return";
type SortDirection = "asc" | "desc";

export function SortableProvidersTable({ providers, showAll = false }: SortableProvidersTableProps) {
  const [sortField, setSortField] = useState<SortField>("pnl_pct");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedProviders = [...providers].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return (aVal - bVal) * multiplier;
  });

  const displayProviders = showAll ? sortedProviders : sortedProviders.slice(0, 5);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="text-left font-medium hover:text-[#e5e5e5] transition-colors flex items-center gap-1"
    >
      {children}
      {sortField === field && (
        <span className="text-[rgba(34,197,94,0.6)]">
          {sortDirection === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );

  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="border-b border-[#2a2a2a] text-[#737373] text-xs">
            <th className="text-left px-3 sm:px-4 py-3 font-medium">#</th>
            <th className="text-left px-3 sm:px-4 py-3 font-medium">Provider</th>
            <th className="text-right px-3 sm:px-4 py-3">
              <SortButton field="pnl_pct">PnL</SortButton>
            </th>
            <th className="text-right px-4 py-3">
              <SortButton field="win_rate">Win%</SortButton>
            </th>
            <th className="text-right px-4 py-3">
              <SortButton field="signal_count">Signals</SortButton>
            </th>
            <th className="text-right px-4 py-3 font-medium">Subs</th>
          </tr>
        </thead>
        <tbody>
          {displayProviders.map((p, i) => (
            <tr key={p.address} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 font-mono text-[#737373]">{i + 1}</td>
              <td className="px-4 py-3">
                <a href={`/provider/${p.address}`} className="hover:text-[rgba(34,197,94,0.6)] transition-colors flex items-center gap-3">
                  <Avatar address={p.address} name={p.name} size="sm" />
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[#737373] text-xs ml-2 font-mono">{p.address.slice(0, 8)}...</span>
                  </div>
                </a>
              </td>
              <td className={`px-4 py-3 text-right font-mono ${p.pnl_pct >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}`}>
                {p.pnl_pct >= 0 ? "+" : ""}{p.pnl_pct.toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right font-mono">{p.win_rate}%</td>
              <td className="px-4 py-3 text-right font-mono text-[#737373]">{p.signal_count}</td>
              <td className="px-4 py-3 text-right font-mono text-[#737373]">{p.subscriber_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}