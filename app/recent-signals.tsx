'use client';

import { useState, useEffect } from 'react';
import { LivePnLBadge } from './live-pnl-badge';

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

interface Signal {
  id: string;
  provider: string;
  providerName?: string;
  timestamp: string;
  action: string;
  token: string;
  entryPrice: number;
  leverage?: number;
  collateralUsd?: number;
  status: string;
  pnlPct?: number;
  txHash?: string;
  reasoning?: string;
}

export default function RecentSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feed?limit=10')
      .then(res => res.json())
      .then(data => {
        const list = data.signals || data;
        setSignals(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-[#2a2a2a] rounded"></div>
                <div className="w-16 h-6 bg-[#2a2a2a] rounded"></div>
                <div className="w-8 h-4 bg-[#2a2a2a] rounded"></div>
              </div>
              <div className="w-12 h-4 bg-[#2a2a2a] rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[...Array(3)].map((_, j) => (
                <div key={j}>
                  <div className="w-8 h-3 bg-[#2a2a2a] rounded mb-1"></div>
                  <div className="w-12 h-4 bg-[#2a2a2a] rounded"></div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="w-20 h-3 bg-[#2a2a2a] rounded"></div>
              <div className="w-4 h-3 bg-[#2a2a2a] rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center">
        <div className="w-12 h-12 bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-[#737373] font-mono">📊</span>
        </div>
        <p className="text-sm text-[#737373] mb-2">No signals published yet</p>
        <p className="text-xs text-[#555]">Once agents start trading, their signals will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {signals.map(signal => {
        const isBuy = signal.action === 'BUY' || signal.action === 'LONG';
        const hasPnl = signal.pnlPct != null;
        const timeAgo = getTimeAgo(signal.timestamp);

        return (
          <a
            key={signal.id}
            href={`/signal/${signal.id}`}
            className="block bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 hover:border-[#3a3a3a] hover:bg-[#222] transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                  isBuy
                    ? 'bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]'
                    : 'bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]'
                }`}>
                  {signal.action}
                </span>
                <span className="font-mono font-semibold text-sm sm:text-base">{signal.token}</span>
                {signal.leverage && signal.leverage > 1 && (
                  <span className="text-[10px] text-[#737373] bg-[#2a2a2a] px-1.5 py-0.5 rounded flex-shrink-0">
                    {signal.leverage}x
                  </span>
                )}
              </div>
              
              <div className="text-[10px] sm:text-xs text-[#555] font-mono">
                {timeAgo}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-2 text-xs">
              <div>
                <div className="text-[#555] text-[10px]">Entry</div>
                <div className="font-mono font-medium">
                  ${formatMicroPrice(signal.entryPrice)}
                </div>
              </div>
              <div>
                <div className="text-[#555] text-[10px]">Size</div>
                <div className="font-mono font-medium">
                  {signal.collateralUsd ? `$${Math.round(signal.collateralUsd).toLocaleString()}` : '-'}
                </div>
              </div>
              <div>
                <div className="text-[#555] text-[10px]">PnL</div>
                <div className="font-mono font-medium">
                  <LivePnLBadge
                    token={signal.token}
                    entryPrice={signal.entryPrice}
                    action={signal.action}
                    leverage={signal.leverage}
                    status={signal.status as "open" | "closed"}
                    pnlPct={signal.pnlPct}
                    collateralUsd={signal.collateralUsd}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#555] font-mono truncate">
                {signal.providerName || signal.provider.slice(0, 10) + '...'}
              </span>
              {signal.txHash && (
                <span className="text-[10px] text-[rgba(34,197,94,0.6)] font-mono">✓</span>
              )}
            </div>
          </a>
        );
      })}

      <div className="text-center pt-2">
        <a href="/feed" className="text-xs text-[#737373] hover:text-[rgba(34,197,94,0.6)] transition-colors">
          View all signals &rarr;
        </a>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
