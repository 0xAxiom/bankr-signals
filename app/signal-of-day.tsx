'use client';

import { useState, useEffect } from 'react';

interface Signal {
  id: string;
  provider: string;
  timestamp: string;
  action: 'LONG' | 'SHORT' | 'BUY' | 'SELL';
  token: string;
  entryPrice: number;
  leverage: number;
  pnlPct?: number;
  status: 'open' | 'closed';
  reasoning?: string;
}

interface Provider {
  address: string;
  name: string;
  avatar?: string;
}

export default function SignalOfDay() {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/signal-of-day')
      .then(res => res.json())
      .then(json => {
        const data = json.data || json;
        setSignal(data.signal);
        setProvider(data.provider);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load signal of day:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#2a2a2a] rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-[#2a2a2a] rounded mb-4 w-1/3"></div>
        <div className="h-4 bg-[#2a2a2a] rounded mb-2"></div>
        <div className="h-4 bg-[#2a2a2a] rounded w-2/3"></div>
      </div>
    );
  }

  if (!signal || !provider) {
    return (
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2 text-[#e5e5e5]">📊 Signal of the Day</h3>
        <p className="text-[#999] text-sm">No signals available</p>
      </div>
    );
  }

  const profitColor = signal.pnlPct !== undefined 
    ? signal.pnlPct > 0 
      ? 'text-green-400' 
      : signal.pnlPct < 0 
        ? 'text-red-400' 
        : 'text-[#999]'
    : 'text-orange-400';

  const statusBadge = signal.status === 'open' 
    ? <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-mono">OPEN</span>
    : <span className="bg-[#2a2a2a] text-[#999] px-2 py-1 rounded text-xs font-mono">CLOSED</span>;

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#e5e5e5] flex items-center gap-2">
          📊 Signal of the Day
        </h3>
        {statusBadge}
      </div>
      
      <div className="flex items-start gap-4">
        {provider.avatar && (
          <img 
            src={provider.avatar} 
            alt={provider.name}
            className="w-10 h-10 rounded-full border border-[#2a2a2a]"
          />
        )}
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-[#e5e5e5]">{provider.name}</span>
            <span className={`font-mono text-sm ${['LONG','BUY'].includes(signal.action) ? 'text-green-400' : 'text-red-400'}`}>
              {signal.action}
            </span>
            <span className="font-mono text-sm text-[#e5e5e5]">{signal.token}</span>
            {signal.leverage && <span className="font-mono text-xs text-[#999]">{signal.leverage}x</span>}
          </div>
          
          <div className="text-sm text-[#999] mb-2">
            Entry: ${signal.entryPrice < 0.01 
              ? signal.entryPrice.toExponential(2) 
              : signal.entryPrice.toLocaleString()}
            {signal.pnlPct !== undefined && (
              <span className={`ml-4 font-mono ${profitColor}`}>
                {(signal.pnlPct ?? 0) > 0 ? '+' : ''}{(signal.pnlPct ?? 0).toFixed(2)}%
              </span>
            )}
          </div>
          
          {signal.reasoning && (
            <div className="text-sm text-[#b0b0b0] bg-[#111] border border-[#2a2a2a] rounded p-3 mt-3">
              "{signal.reasoning}"
            </div>
          )}
          
          <div className="mt-3 text-xs text-[#666]">
            {new Date(signal.timestamp).toLocaleDateString()} • 
            <a 
              href={`/signal/${signal.id}`}
              className="text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.8)] ml-1"
            >
              View Details
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}