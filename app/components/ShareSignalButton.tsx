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
  status?: string;
}

interface ShareSignalButtonProps {
  signal: Signal;
  variant?: 'icon' | 'full';
  className?: string;
}

export function ShareSignalButton({ signal, variant = 'icon', className = '' }: ShareSignalButtonProps) {
  const [copied, setCopied] = useState(false);

  const formatPrice = (price: number) => {
    return price >= 1000 
      ? `$${(price / 1000).toFixed(1)}k` 
      : `$${price.toLocaleString()}`;
  };

  const signalUrl = `${window.location.origin}/signal/${signal.id}`;
  
  const tweetText = `🚀 ${signal.action} ${signal.token}${signal.leverage && signal.leverage > 1 ? ` ${signal.leverage}x` : ''} at ${formatPrice(signal.entryPrice)}${signal.pnlPct ? ` | ${signal.pnlPct > 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}% PnL` : ''}

"${signal.reasoning || 'Strong technical setup'}"

by ${signal.provider} on @BankrSignals

#DeFi #Trading #Signals`;

  const handleShare = (platform: 'twitter' | 'copy') => {
    if (platform === 'twitter') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(signalUrl)}`;
      window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(signalUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (variant === 'icon') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => handleShare('twitter')}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 px-2 py-1 hover:bg-blue-500/10 rounded"
          title="Share on X"
        >
          <span>🐦</span>
        </button>
        
        <button
          onClick={() => handleShare('copy')}
          className={`text-xs transition-colors flex items-center gap-1 px-2 py-1 rounded ${
            copied 
              ? 'text-green-400 bg-green-500/10' 
              : 'text-[#737373] hover:text-[#e5e5e5] hover:bg-[#2a2a2a]'
          }`}
          title={copied ? 'Copied!' : 'Copy link'}
        >
          <span>{copied ? '✅' : '📋'}</span>
        </button>
        
        <a
          href={`/signal/${signal.id}`}
          className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors flex items-center gap-1 px-2 py-1 hover:bg-[#2a2a2a] rounded"
          title="View details"
        >
          <span>🔗</span>
        </a>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => handleShare('twitter')}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors"
      >
        <span>🐦</span> Share
      </button>
      
      <button
        onClick={() => handleShare('copy')}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded font-medium transition-colors ${
          copied 
            ? 'bg-green-500/20 text-green-400 border border-green-500/40' 
            : 'bg-[#2a2a2a] hover:bg-[#333] text-white'
        }`}
      >
        <span>{copied ? '✅' : '📋'}</span>
        {copied ? 'Copied!' : 'Copy'}
      </button>
      
      <a
        href={`/signal/${signal.id}`}
        className="flex items-center gap-2 px-3 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm rounded font-medium transition-colors"
      >
        <span>🔗</span> Details
      </a>
    </div>
  );
}