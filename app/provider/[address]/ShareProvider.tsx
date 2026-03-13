'use client';

import { useState } from 'react';

interface ShareProviderProps {
  provider: {
    name: string;
    address: string;
    signal_count: number;
    win_rate: number;
    total_pnl: number;
    best_trade_pct?: number;
    roi: number;
  };
  topSignals?: Array<{
    id: string;
    action: string;
    token: string;
    leverage?: number;
    pnlPct?: number;
    reasoning?: string;
  }>;
}

export function ShareProvider({ provider, topSignals = [] }: ShareProviderProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const formatPnL = (pnl: number) => {
    if (pnl >= 0) return `+$${pnl.toFixed(2)}`;
    return `-$${Math.abs(pnl).toFixed(2)}`;
  };

  const generatePerformanceTweet = () => {
    const bestTrade = provider.best_trade_pct ? `Best trade: +${provider.best_trade_pct.toFixed(1)}%` : '';
    const topSignalsText = topSignals.length > 0 
      ? `\n\nRecent hits:\n${topSignals.slice(0, 3).map(s => 
          `• ${s.action} ${s.token}${s.leverage ? ` ${s.leverage}x` : ''}: ${s.pnlPct ? `+${s.pnlPct.toFixed(1)}%` : 'Open'}`
        ).join('\n')}`
      : '';

    return `📊 Trading Performance Update

${provider.signal_count} verified signals published
${provider.win_rate.toFixed(0)}% win rate
${formatPnL(provider.total_pnl)} total PnL
${provider.roi.toFixed(1)}% ROI
${bestTrade}${topSignalsText}

All trades verified on-chain ⚡
Track my signals: bankrsignals.com/provider/${provider.address}`;
  };

  const generateMilestoneText = () => {
    let milestone = '';
    if (provider.signal_count >= 100) milestone = `💯 Just hit ${provider.signal_count} verified signals!`;
    else if (provider.win_rate >= 80) milestone = `🎯 Maintaining ${provider.win_rate.toFixed(0)}% win rate`;
    else if (provider.total_pnl >= 100) milestone = `💰 Crossed $${provider.total_pnl.toFixed(0)} in verified profits`;
    else milestone = `📈 Building track record: ${provider.signal_count} signals`;

    return `${milestone}

${provider.name} performance:
• ${provider.signal_count} verified trades
• ${provider.win_rate.toFixed(0)}% win rate  
• ${formatPnL(provider.total_pnl)} PnL
• ${provider.roi.toFixed(1)}% ROI

Every trade backed by Base blockchain TX ⚡
bankrsignals.com/provider/${provider.address}`;
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  // Don't show if no meaningful stats yet
  if (provider.signal_count < 3) {
    return null;
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📢</span> Share Your Performance
      </h2>
      
      {/* Performance highlight */}
      <div className="mb-4 p-4 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-lg">
        <div className="text-sm text-[rgba(34,197,94,0.9)] font-medium mb-2">
          🏆 Your Track Record Highlights
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-[#e5e5e5] font-semibold">{provider.signal_count}</div>
            <div className="text-[#737373] text-xs">Signals</div>
          </div>
          <div>
            <div className="text-[#e5e5e5] font-semibold">{provider.win_rate.toFixed(0)}%</div>
            <div className="text-[#737373] text-xs">Win Rate</div>
          </div>
          <div>
            <div className="text-[#e5e5e5] font-semibold">{formatPnL(provider.total_pnl)}</div>
            <div className="text-[#737373] text-xs">Total PnL</div>
          </div>
          <div>
            <div className="text-[#e5e5e5] font-semibold">{provider.roi.toFixed(1)}%</div>
            <div className="text-[#737373] text-xs">ROI</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Performance Update Tweet */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[#e5e5e5]">Performance Update</label>
            <button
              onClick={() => copyToClipboard(generatePerformanceTweet(), 'performance')}
              className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                copied === 'performance'
                  ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                  : 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
              }`}
            >
              {copied === 'performance' ? '✅ Copied!' : '📋 Copy Text'}
            </button>
          </div>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap font-sans leading-relaxed">
              {generatePerformanceTweet()}
            </pre>
          </div>
        </div>

        {/* Milestone Tweet */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[#e5e5e5]">Milestone Celebration</label>
            <button
              onClick={() => copyToClipboard(generateMilestoneText(), 'milestone')}
              className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                copied === 'milestone'
                  ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                  : 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
              }`}
            >
              {copied === 'milestone' ? '✅ Copied!' : '📋 Copy Text'}
            </button>
          </div>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap font-sans leading-relaxed">
              {generateMilestoneText()}
            </pre>
          </div>
        </div>
      </div>

      {/* Share buttons */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(generatePerformanceTweet())}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <span>🐦</span> Tweet Performance
        </a>
        
        <button
          onClick={() => {
            const url = typeof window !== 'undefined' ? window.location.href : '';
            copyToClipboard(url, 'link');
          }}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors text-sm ${
            copied === 'link'
              ? 'bg-green-600 text-white'
              : 'bg-[#2a2a2a] hover:bg-[#333] text-white'
          }`}
        >
          <span>📋</span> {copied === 'link' ? 'Copied!' : 'Copy Profile'}
        </button>

        <button
          onClick={() => {
            const farcasterText = generateMilestoneText();
            const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(farcasterText)}`;
            window.open(farcasterUrl, '_blank');
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <span>🟣</span> Farcaster
        </button>
      </div>

      {/* Performance tips */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-blue-400 mb-1">
          <span>💡</span>
          <span className="font-medium">Growth Tips</span>
        </div>
        <div className="text-xs text-[#b0b0b0] space-y-1">
          <div>• Share performance updates after profitable trades</div>
          <div>• Post milestone celebrations to build following</div>
          <div>• Link to specific winning signals for credibility</div>
        </div>
      </div>
    </div>
  );
}