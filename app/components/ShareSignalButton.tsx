'use client';

import { useState } from 'react';

interface Signal {
  id: string;
  provider: string;
  action: string;
  token: string;
  entryPrice: number;
  leverage?: number;
  reasoning: string;
  pnlPct?: number;
  status: string;
}

interface ShareSignalButtonProps {
  signal: Signal;
  variant?: 'icon' | 'full';
}

export function ShareSignalButton({ signal, variant = 'icon' }: ShareSignalButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bankrsignals.com';
  const signalUrl = `${baseUrl}/signal/${signal.id}`;

  // Generate OG image URL with signal data
  const ogImageUrl = `${baseUrl}/api/og/signal?` + new URLSearchParams({
    id: signal.id,
    provider: signal.provider,
    action: signal.action,
    token: signal.token,
    entryPrice: signal.entryPrice.toString(),
    leverage: signal.leverage?.toString() || '1',
    reasoning: signal.reasoning,
    ...(signal.pnlPct && { 
      pnl: ((signal.entryPrice * (signal.pnlPct / 100))).toFixed(2),
      pnlPercent: signal.pnlPct.toString()
    }),
    status: signal.status.toUpperCase()
  }).toString();

  const shareText = `📊 ${signal.action} $${signal.token} Signal by ${signal.provider}

${signal.leverage && signal.leverage > 1 ? `${signal.leverage}x Leverage • ` : ''}$${signal.entryPrice} Entry${signal.pnlPct ? ` • ${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}% PnL` : ''}

"${signal.reasoning}"

Verified onchain • Trade with confidence
${signalUrl}

#BankrSignals #OnchainAlpha #DeFi #TradingSignals`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(signalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  const getProfitEmoji = () => {
    if (!signal.pnlPct) return '📊';
    return signal.pnlPct >= 0 ? '🚀' : '📉';
  };

  const handleShare = (platform: 'twitter' | 'farcaster' | 'copy') => {
    if (platform === 'copy') {
      copyToClipboard();
    } else if (platform === 'twitter') {
      window.open(twitterUrl, '_blank');
    } else if (platform === 'farcaster') {
      window.open(farcasterUrl, '_blank');
    }
    setShowDropdown(false);
  };

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors"
        >
          <span className="text-sm">{getProfitEmoji()}</span>
          <span>Share</span>
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute bottom-full mb-2 right-0 bg-[#111] border border-[#2a2a2a] rounded-lg shadow-lg py-2 z-20 min-w-[140px]">
              <button
                onClick={() => handleShare('twitter')}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#e5e5e5] hover:bg-[#1a1a1a] w-full text-left transition-colors"
              >
                <span className="text-[#1da1f2]">🐦</span>
                Twitter/X
              </button>
              <button
                onClick={() => handleShare('farcaster')}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#e5e5e5] hover:bg-[#1a1a1a] w-full text-left transition-colors"
              >
                <span className="text-[#8a63d2]">🟣</span>
                Farcaster
              </button>
              <button
                onClick={() => handleShare('copy')}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#e5e5e5] hover:bg-[#1a1a1a] w-full text-left transition-colors"
              >
                <span className={copied ? "text-green-400" : "text-[#737373]"}>
                  {copied ? '✅' : '📋'}
                </span>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleShare('twitter')}
        className="flex items-center gap-2 px-4 py-2 bg-[#1da1f2] hover:bg-[#1a8cd8] text-white rounded-lg text-sm font-medium transition-colors"
      >
        <span>🐦</span>
        Share on X
      </button>
      <button
        onClick={() => handleShare('farcaster')}
        className="flex items-center gap-2 px-4 py-2 bg-[#8a63d2] hover:bg-[#7c5abd] text-white rounded-lg text-sm font-medium transition-colors"
      >
        <span>🟣</span>
        Farcaster
      </button>
      <button
        onClick={() => handleShare('copy')}
        className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e5e5e5] rounded-lg text-sm font-medium transition-colors"
      >
        <span className={copied ? "text-green-400" : ""}>{copied ? '✅' : '📋'}</span>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}