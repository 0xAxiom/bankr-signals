"use client";

import { useState, useMemo } from "react";
import { ParsedTrade } from "@/lib/signals";

interface PositionSizingCalculatorProps {
  trades: ParsedTrade[];
  providerName: string;
}

interface KellyStats {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  kellyPct: number;
  fullKellySize: number;
  halfKellySize: number;
  quarterKellySize: number;
  expectedValue: number;
  riskOfRuin: number;
  closedTrades: number;
}

function computeKelly(trades: ParsedTrade[], portfolioSize: number): KellyStats | null {
  const closed = trades.filter(
    (t) => t.status === "closed" && t.pnl != null
  );
  if (closed.length < 3) return null;

  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) <= 0);

  if (wins.length === 0 || losses.length === 0) return null;

  const winRate = wins.length / closed.length;
  const avgWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length / 100;
  const avgLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) / 100;

  // Kelly formula: K = (W * b - (1 - W)) / b, where b = avg win / avg loss
  const b = avgWin / avgLoss;
  const q = 1 - winRate;
  const kellyPct = Math.max(0, (winRate * b - q) / b);

  // Risk of ruin approximation (simplified)
  // R = ((1 - kellyPct * b) / (1 + kellyPct * b)) ^ (N/tradeCount)
  const riskOfRuin = kellyPct > 0
    ? Math.pow(Math.max(0, (1 - kellyPct) / (1 + kellyPct * b)), 20) * 100
    : 100;

  return {
    winRate: winRate * 100,
    avgWin: avgWin * 100,
    avgLoss: avgLoss * 100,
    kellyPct: kellyPct * 100,
    fullKellySize: portfolioSize * kellyPct,
    halfKellySize: portfolioSize * kellyPct * 0.5,
    quarterKellySize: portfolioSize * kellyPct * 0.25,
    expectedValue: (winRate * avgWin - q * avgLoss) * 100,
    riskOfRuin: Math.min(99.9, riskOfRuin),
    closedTrades: closed.length,
  };
}

function fmt(n: number) {
  if (n >= 10000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${n.toFixed(0)}`;
}

export function PositionSizingCalculator({
  trades,
  providerName,
}: PositionSizingCalculatorProps) {
  const [portfolioSize, setPortfolioSize] = useState(10000);
  const [inputValue, setInputValue] = useState("10000");

  const stats = useMemo(
    () => computeKelly(trades, portfolioSize),
    [trades, portfolioSize]
  );

  const closedCount = trades.filter(
    (t) => t.status === "closed" && t.pnl != null
  ).length;

  if (closedCount < 3) {
    return (
      <div className="border border-[#2a2a2a] rounded-lg p-4 bg-[#111]">
        <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
          Position Sizing
        </h3>
        <p className="text-xs text-[#555]">
          Needs at least 3 closed trades to calculate Kelly sizing.
        </p>
      </div>
    );
  }

  if (!stats) return null;

  const kellyLabel =
    stats.kellyPct <= 0
      ? "Negative edge — avoid trading"
      : stats.kellyPct < 5
      ? "Small edge"
      : stats.kellyPct < 15
      ? "Moderate edge"
      : "Strong edge";

  const kellyColor =
    stats.kellyPct <= 0
      ? "text-[rgba(239,68,68,0.8)]"
      : stats.kellyPct < 10
      ? "text-[rgba(234,179,8,0.8)]"
      : "text-[rgba(34,197,94,0.8)]";

  return (
    <div className="border border-[#2a2a2a] rounded-lg p-4 sm:p-6 bg-[#111]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wider">
          Position Sizing Calculator
        </h3>
        <span className="text-[10px] text-[#555] font-mono">
          Kelly Criterion · {stats.closedTrades} closed trades
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-2.5">
          <div className="text-xs font-mono font-semibold text-[rgba(34,197,94,0.7)]">
            {stats.winRate.toFixed(0)}%
          </div>
          <div className="text-[10px] text-[#555] mt-0.5">Win Rate</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-2.5">
          <div className="text-xs font-mono font-semibold text-[rgba(34,197,94,0.7)]">
            +{stats.avgWin.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#555] mt-0.5">Avg Win</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-2.5">
          <div className="text-xs font-mono font-semibold text-[rgba(239,68,68,0.7)]">
            -{stats.avgLoss.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#555] mt-0.5">Avg Loss</div>
        </div>
      </div>

      {/* Kelly % */}
      <div className="mb-5 p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#555] uppercase tracking-wider">
            Kelly %
          </span>
          <span className={`text-[10px] font-medium ${kellyColor}`}>
            {kellyLabel}
          </span>
        </div>
        <div className={`text-2xl font-mono font-bold ${kellyColor}`}>
          {stats.kellyPct.toFixed(1)}%
        </div>
        <div className="text-[10px] text-[#555] mt-1">
          Expected value per trade:{" "}
          <span
            className={
              stats.expectedValue >= 0
                ? "text-[rgba(34,197,94,0.6)]"
                : "text-[rgba(239,68,68,0.6)]"
            }
          >
            {stats.expectedValue >= 0 ? "+" : ""}
            {stats.expectedValue.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Portfolio input */}
      <div className="mb-5">
        <label className="text-[10px] text-[#737373] uppercase tracking-wider block mb-2">
          Your Portfolio Size
        </label>
        <div className="flex items-center gap-3">
          <span className="text-[#555] text-sm font-mono">$</span>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) setPortfolioSize(val);
            }}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm font-mono text-[#e5e5e5] focus:outline-none focus:border-[#444] min-w-0"
            min={100}
            step={1000}
          />
        </div>
        <input
          type="range"
          min={1000}
          max={1000000}
          step={1000}
          value={Math.min(portfolioSize, 1000000)}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setPortfolioSize(val);
            setInputValue(val.toString());
          }}
          className="w-full mt-2 accent-green-500"
        />
        <div className="flex justify-between text-[10px] text-[#555] font-mono">
          <span>$1k</span>
          <span>$1M</span>
        </div>
      </div>

      {/* Sizing recommendations */}
      <div className="space-y-2 mb-4">
        <div className="text-[10px] text-[#737373] uppercase tracking-wider mb-3">
          Recommended Position Sizes
        </div>

        {[
          {
            label: "Full Kelly",
            pct: stats.kellyPct,
            size: stats.fullKellySize,
            desc: "Max mathematical edge — high variance",
            color: "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)]",
            textColor: "text-[rgba(239,68,68,0.8)]",
          },
          {
            label: "Half Kelly",
            pct: stats.kellyPct * 0.5,
            size: stats.halfKellySize,
            desc: "Recommended — balanced risk/reward",
            color:
              "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.05)]",
            textColor: "text-[rgba(34,197,94,0.8)]",
            highlight: true,
          },
          {
            label: "Quarter Kelly",
            pct: stats.kellyPct * 0.25,
            size: stats.quarterKellySize,
            desc: "Conservative — for uncertain providers",
            color: "border-[#2a2a2a] bg-[#1a1a1a]",
            textColor: "text-[#e5e5e5]",
          },
        ].map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-3 py-2.5 rounded border ${row.color} ${row.highlight ? "ring-1 ring-[rgba(34,197,94,0.2)]" : ""}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#e5e5e5]">
                  {row.label}
                </span>
                {row.highlight && (
                  <span className="text-[9px] text-[rgba(34,197,94,0.7)] bg-[rgba(34,197,94,0.1)] px-1.5 py-0.5 rounded">
                    RECOMMENDED
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#555] mt-0.5">{row.desc}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-mono font-bold ${row.textColor}`}>
                {fmt(row.size)}
              </div>
              <div className="text-[10px] text-[#555] font-mono">
                {row.pct.toFixed(1)}% of portfolio
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#444] leading-relaxed">
        Kelly Criterion optimizes long-term growth based on {providerName}&apos;s
        historical win rate and average trade returns. Past performance does not
        guarantee future results. Never risk more than you can afford to lose.
      </p>
    </div>
  );
}
