'use client';

import { useState, useEffect } from 'react';

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
          <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-[#2a2a2a] rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-[#2a2a2a] rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center">
        <p className="text-sm text-[#737373]">No signals yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signals.map(signal => {
        const isBuy = signal.action === 'BUY' || signal.action === 'LONG';
        const hasPnl = signal.pnlPct != null;
        const timeAgo = getTimeAgo(signal.timestamp);

        return (
          <a
            key={signal.id}
            href={`/signal/${signal.id}`}
            className="block bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 hover:border-[#3a3a3a] transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0 ${
                  isBuy
                    ? 'bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]'
                    : 'bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]'
                }`}>
                  {signal.action}
                </span>
                <span className="font-mono font-semibold text-sm">{signal.token}</span>
                {signal.leverage && signal.leverage > 1 && (
                  <span className="text-[10px] text-[#737373] bg-[#2a2a2a] px-1.5 py-0.5 rounded flex-shrink-0">
                    {signal.leverage}x
                  </span>
                )}
                <span className="text-xs text-[#737373] font-mono">
                  ${signal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {signal.collateralUsd && (
                  <span className="text-xs text-[#555] font-mono hidden sm:inline">
                    ${signal.collateralUsd.toFixed(0)}
                  </span>
                )}
                {hasPnl ? (
                  <span className={`text-xs font-mono font-bold ${
                    signal.pnlPct! >= 0 ? 'text-[rgba(34,197,94,0.8)]' : 'text-[rgba(239,68,68,0.8)]'
                  }`}>
                    {signal.pnlPct! > 0 ? '+' : ''}{signal.pnlPct!.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-[rgba(234,179,8,0.6)]">OPEN</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-[#555]">
                {signal.providerName || signal.provider.slice(0, 10) + '...'} - {timeAgo}
              </span>
              {signal.txHash && (
                <span className="text-[10px] text-[rgba(34,197,94,0.4)] font-mono">✓ verified</span>
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
