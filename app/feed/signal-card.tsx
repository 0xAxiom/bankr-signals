"use client";

import { useState } from "react";
import { Sparkline, ConfidenceMeter, ExpandableReasoning, RelativeTimestamp } from "./components";

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
}

interface SignalCardProps {
  trade: TradeWithProvider;
}

// Generate mock sparkline data based on trade (in real app, this would come from API)
function generateSparklineData(trade: TradeWithProvider): number[] {
  const basePrice = trade.entryPrice;
  if (!basePrice || !trade.pnl) return [];
  
  // Create 15 data points showing price movement since entry
  const currentChange = trade.pnl / 100; // PnL as decimal
  const points = [];
  
  for (let i = 0; i < 15; i++) {
    const progress = i / 14;
    // Add some randomness but trend toward current PnL
    const noise = (Math.random() - 0.5) * 0.02;
    const trendedChange = currentChange * progress + noise;
    points.push(basePrice * (1 + trendedChange));
  }
  
  return points;
}

// Generate mock confidence based on trade characteristics
function generateConfidence(trade: TradeWithProvider): number {
  let confidence = 50; // Base confidence
  
  // Higher confidence for leveraged trades (implies conviction)
  if (trade.leverage && trade.leverage > 1) {
    confidence += Math.min(20, trade.leverage * 3);
  }
  
  // Higher confidence for larger positions
  if (trade.collateralUsd && trade.collateralUsd > 1000) {
    confidence += 15;
  }
  
  // Lower confidence for stopped trades
  if (trade.status === "stopped") {
    confidence -= 20;
  }
  
  // Adjust based on current PnL (if profitable, was likely high confidence)
  if (trade.pnl !== undefined) {
    if (trade.pnl > 10) confidence += 10;
    else if (trade.pnl < -10) confidence -= 15;
  }
  
  return Math.max(20, Math.min(95, confidence + (Math.random() - 0.5) * 10));
}

// Generate mock reasoning based on trade
function generateReasoning(trade: TradeWithProvider): string {
  const templates = {
    BUY: [
      `Strong support level at $${trade.entryPrice.toFixed(2)} with high volume. Technical indicators showing bullish divergence.`,
      `Break above key resistance with increased volume. Target upside of 15-20% based on historical patterns.`,
      `Oversold conditions creating buying opportunity. RSI at 25 with positive momentum building.`
    ],
    SELL: [
      `Profit-taking after strong run-up. Technical resistance at current levels unlikely to break.`,
      `Distribution pattern forming with decreasing volume. Risk/reward no longer favorable.`,
      `Overbought signals across multiple timeframes. Taking profits while momentum is still positive.`
    ],
    LONG: [
      `${trade.leverage}x leveraged long based on macro trend alignment and technical breakout. Stop set at -${(100/trade.leverage!*0.8).toFixed(0)}%.`,
      `Strong fundamental catalyst + technical setup. Using ${trade.leverage}x leverage to amplify returns on high-conviction play.`,
      `Multi-timeframe confluence showing strong uptrend. ${trade.leverage}x position sized for ${(trade.leverage! * 8).toFixed(0)}% upside target.`
    ],
    SHORT: [
      `${trade.leverage}x short on technical breakdown below key support. Expecting 10-15% downside.`,
      `Bearish divergence confirmed with high volume. Using ${trade.leverage}x leverage for mean reversion play.`,
      `Overextended rally showing signs of exhaustion. ${trade.leverage}x short with tight risk management.`
    ]
  };
  
  const options = templates[trade.action] || [];
  return options[Math.floor(Math.random() * options.length)] || "Standard technical setup with favorable risk/reward ratio.";
}

export function SignalCard({ trade }: SignalCardProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  
  const isBuy = trade.action === "BUY" || trade.action === "LONG";
  const sparklineData = generateSparklineData(trade);
  const confidence = generateConfidence(trade);
  const reasoning = generateReasoning(trade);
  
  // Calculate dollar PnL if we have the data
  const dollarPnl = trade.collateralUsd && trade.pnl 
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
      <div className="flex items-start justify-between mb-4">
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
          <span className="font-mono font-semibold text-lg">{trade.token}</span>
          {trade.leverage && (
            <span className="text-xs text-[#737373] bg-[#2a2a2a] px-2 py-0.5 rounded">
              {trade.leverage}x
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {sparklineData.length > 0 && (
            <div className="flex flex-col items-end">
              <Sparkline points={sparklineData} />
              <div className="text-xs text-[#737373] mt-1">Price since entry</div>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-[#737373]">
            <RelativeTimestamp timestamp={trade.timestamp} />
            <a
              href={`/provider/${trade.providerAddress}`}
              className="hover:text-[#e5e5e5] font-mono transition-colors"
            >
              {trade.providerName}
            </a>
          </div>
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#737373]">Confidence</span>
          <span className="text-xs font-mono text-[#e5e5e5]">{confidence.toFixed(0)}%</span>
        </div>
        <ConfidenceMeter confidence={confidence} />
      </div>

      <div className="grid grid-cols-4 gap-4 text-xs mb-3">
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
              {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(1)}%
              {dollarPnl && (
                <div className="text-xs opacity-75">
                  ${dollarPnl >= 0 ? "+" : ""}{dollarPnl.toFixed(2)}
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

      <ExpandableReasoning 
        reasoning={reasoning}
        isExpanded={isReasoningExpanded}
        onToggle={() => setIsReasoningExpanded(!isReasoningExpanded)}
      />

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