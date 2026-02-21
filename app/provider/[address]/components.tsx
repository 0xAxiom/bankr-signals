"use client";

import { ParsedTrade } from "@/lib/signals";

interface EquityCurveProps {
  trades: ParsedTrade[];
}

export function EquityCurve({ trades }: EquityCurveProps) {
  if (trades.length === 0) {
    return (
      <div className="w-full h-32 bg-[#1a1a1a] rounded border border-[#2a2a2a] flex items-center justify-center text-xs text-[#737373]">
        No trade history available
      </div>
    );
  }

  // Calculate cumulative PnL over time
  const equityPoints: { date: Date; pnl: number }[] = [];
  let runningPnl = 0;

  // Issue #8: Use exitTimestamp for closed trades, only show realized PnL
  const closedTrades = trades
    .filter(trade => trade.status === "closed" && trade.pnl !== undefined)
    .sort((a, b) => new Date(a.exitTimestamp || a.timestamp).getTime() - new Date(b.exitTimestamp || b.timestamp).getTime());

  closedTrades.forEach(trade => {
    runningPnl += trade.pnl!;
    equityPoints.push({
      date: new Date(trade.exitTimestamp || trade.timestamp),
      pnl: runningPnl
    });
  });

  if (equityPoints.length === 0) return null;

  const minPnL = Math.min(0, ...equityPoints.map(p => p.pnl));
  const maxPnL = Math.max(...equityPoints.map(p => p.pnl));
  const range = maxPnL - minPnL || 1;
  
  const width = 400;
  const height = 120;
  const padding = 20;
  
  const pathData = equityPoints
    .map((point, i) => {
      // Issue #17: Prevent divide by zero
      const x = padding + (i / Math.max(1, equityPoints.length - 1)) * (width - padding * 2);
      const y = padding + ((maxPnL - point.pnl) / range) * (height - padding * 2);
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    })
    .join(" ");

  const finalPnl = equityPoints[equityPoints.length - 1].pnl;
  const isPositive = finalPnl >= 0;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#e5e5e5]">Equity Curve</h3>
        <div className="text-xs text-[#737373]">
          Total: <span className={`font-mono ${isPositive ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}`}>
            {finalPnl > 0 ? "+" : ""}{finalPnl.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-24 sm:h-[120px]">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 30" fill="none" stroke="rgba(115, 115, 115, 0.1)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Zero line */}
        {minPnL < 0 && (
          <line
            x1={padding}
            y1={padding + ((maxPnL - 0) / range) * (height - padding * 2)}
            x2={width - padding}
            y2={padding + ((maxPnL - 0) / range) * (height - padding * 2)}
            stroke="rgba(115, 115, 115, 0.3)"
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
        
        {/* Data points */}
        {equityPoints.map((point, i) => {
          const x = padding + (i / Math.max(1, equityPoints.length - 1)) * (width - padding * 2);
          const y = padding + ((maxPnL - point.pnl) / range) * (height - padding * 2);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill={point.pnl >= 0 ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)"}
            />
          );
        })}
      </svg>
    </div>
  );
}

interface PerformanceGridProps {
  trades: ParsedTrade[];
}

export function PerformanceGrid({ trades }: PerformanceGridProps) {
  if (trades.length === 0) return null;

  // Group trades by day for the last 60 days
  const now = new Date();
  const days: { date: Date; pnl: number; trades: number }[] = [];
  
  for (let i = 59; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const dayTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.timestamp);
      tradeDate.setHours(0, 0, 0, 0);
      return tradeDate.getTime() === date.getTime();
    });
    
    const dayPnL = dayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    days.push({
      date,
      pnl: dayPnL,
      trades: dayTrades.length
    });
  }

  const maxAbsPnL = Math.max(...days.map(d => Math.abs(d.pnl)));

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#e5e5e5]">Last 60 Days</h3>
        <div className="flex items-center gap-2 text-xs text-[#737373]">
          <div className="w-2 h-2 bg-[rgba(239,68,68,0.6)] rounded"></div>
          <span>Loss</span>
          <div className="w-2 h-2 bg-[#2a2a2a] rounded"></div>
          <span>No trades</span>
          <div className="w-2 h-2 bg-[rgba(34,197,94,0.6)] rounded"></div>
          <span>Profit</span>
        </div>
      </div>
      
      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1">
        {days.map((day, i) => {
          const intensity = maxAbsPnL > 0 ? Math.abs(day.pnl) / maxAbsPnL : 0;
          const isProfit = day.pnl > 0;
          const isLoss = day.pnl < 0;
          
          let bgColor = "#2a2a2a"; // No trades
          if (isProfit) {
            bgColor = `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`;
          } else if (isLoss) {
            bgColor = `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
          }
          
          return (
            <div
              key={i}
              className="w-4 h-4 rounded-sm border border-[#1a1a1a] relative group cursor-help"
              style={{ backgroundColor: bgColor }}
              title={`${day.date.toLocaleDateString()}: ${day.trades} trades, ${day.pnl >= 0 ? "+" : ""}${day.pnl.toFixed(1)}% PnL`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {day.date.toLocaleDateString()}<br/>
                {day.trades} trades<br/>
                {day.pnl >= 0 ? "+" : ""}{day.pnl.toFixed(1)}% PnL
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TradeStatsProps {
  trades: ParsedTrade[];
}

export function TradeStats({ trades }: TradeStatsProps) {
  if (trades.length === 0) return null;

  const closedTrades = trades.filter(t => t.status === "closed" && t.pnl !== undefined);
  
  if (closedTrades.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="text-sm font-medium text-[#e5e5e5] mb-2">Best Trade</div>
          <div className="text-xs text-[#737373]">No closed trades yet</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="text-sm font-medium text-[#e5e5e5] mb-2">Worst Trade</div>
          <div className="text-xs text-[#737373]">No closed trades yet</div>
        </div>
      </div>
    );
  }

  const bestTrade = closedTrades.reduce((best, trade) => 
    (trade.pnl ?? 0) > (best.pnl ?? 0) ? trade : best
  );
  
  const worstTrade = closedTrades.length === 1 ? null : closedTrades.reduce((worst, trade) => 
    (trade.pnl ?? 0) < (worst.pnl ?? 0) ? trade : worst
  );

  // Strategy breakdown
  const longs = trades.filter(t => t.action === "LONG" || t.action === "BUY").length;
  const shorts = trades.filter(t => t.action === "SHORT" || t.action === "SELL").length;
  const totalTrades = longs + shorts;
  
  const avgLeverage = trades
    .filter(t => t.leverage)
    .reduce((sum, t) => sum + (t.leverage || 0), 0) / trades.filter(t => t.leverage).length || 0;
  
  const tokenCounts = trades.reduce((counts, trade) => {
    counts[trade.token] = (counts[trade.token] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const mostTradedToken = Object.entries(tokenCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || "None";

  return (
    <>
      <div className={`grid ${worstTrade ? "grid-cols-2" : "grid-cols-1"} gap-4 mb-4`}>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="text-sm font-medium text-[#e5e5e5] mb-2">{worstTrade ? "Best Trade" : "Only Closed Trade"}</div>
          <div className={`text-xs font-mono mb-1 ${(bestTrade.pnl ?? 0) >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}`}>
            {(bestTrade.pnl ?? 0) > 0 ? "+" : ""}{bestTrade.pnl?.toFixed(1)}%
          </div>
          <div className="text-xs text-[#737373]">
            {bestTrade.action} {bestTrade.token} @ ${bestTrade.entryPrice.toLocaleString()}
          </div>
        </div>
        
        {worstTrade && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <div className="text-sm font-medium text-[#e5e5e5] mb-2">Worst Trade</div>
            <div className={`text-xs font-mono mb-1 ${(worstTrade.pnl ?? 0) >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}`}>
              {(worstTrade.pnl ?? 0) > 0 ? "+" : ""}{worstTrade.pnl?.toFixed(1)}%
            </div>
            <div className="text-xs text-[#737373]">
              {worstTrade.action} {worstTrade.token} @ ${worstTrade.entryPrice.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <div className="text-sm font-medium text-[#e5e5e5] mb-4">Strategy Breakdown</div>
        
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div>
            <div className="text-[#737373] mb-2">Position Bias</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Longs/Buys</span>
                <span className="font-mono">{totalTrades > 0 ? ((longs / totalTrades) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="flex justify-between">
                <span>Shorts/Sells</span>
                <span className="font-mono">{totalTrades > 0 ? ((shorts / totalTrades) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>
          </div>
          
          <div>
            <div className="text-[#737373] mb-2">Trading Stats</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Avg Leverage</span>
                <span className="font-mono">{avgLeverage > 0 ? `${avgLeverage.toFixed(1)}x` : "Spot"}</span>
              </div>
              <div className="flex justify-between">
                <span>Most Traded</span>
                <span className="font-mono">{mostTradedToken}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}