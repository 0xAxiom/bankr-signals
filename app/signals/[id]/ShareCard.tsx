'use client';

import { useState } from 'react';

interface ShareCardProps {
  signal: {
    id: string;
    action: string;
    token: string;
    leverage: number;
    provider: string;
    entryPrice: number;
    exitPrice?: number;
    pnlPct?: number;
    reasoning: string;
    status: string;
    providerAddress: string;
  };
}

export function ShareCard({ signal }: ShareCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const formatPrice = (price: number) => {
    return price >= 1000 
      ? `$${(price / 1000).toFixed(1)}k` 
      : `$${price.toLocaleString()}`;
  };

  const generateShareText = () => {
    const pnlText = signal.pnlPct ? ` • PnL: ${signal.pnlPct > 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}%` : '';
    const exitText = signal.exitPrice ? ` → ${formatPrice(signal.exitPrice)}` : '';
    
    return `${signal.action} ${signal.token} ${signal.leverage > 1 ? `${signal.leverage}x ` : ''}signal from ${signal.provider} 📊

"${signal.reasoning}"

Entry: ${formatPrice(signal.entryPrice)}${exitText}${pnlText}

Verified with blockchain TX on Base ⚡
Track more signals at bankrsignals.com`;
  };

  const generateTwitterUrl = () => {
    const text = generateShareText();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
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

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📤</span> Share This Signal
      </h2>
      
      {/* Pre-written share text */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[#e5e5e5]">Ready-to-post text</label>
          <button
            onClick={() => copyToClipboard(generateShareText(), 'text')}
            className={`text-xs px-3 py-1 rounded-md border transition-colors ${
              copied === 'text'
                ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                : 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
            }`}
          >
            {copied === 'text' ? '✅ Copied!' : '📋 Copy Text'}
          </button>
        </div>
        <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
          <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap font-sans leading-relaxed">
            {generateShareText()}
          </pre>
        </div>
      </div>
      
      {/* Share buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <a
          href={generateTwitterUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <span>🐦</span> Share on X
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
          <span>📋</span> {copied === 'link' ? 'Copied!' : 'Copy Link'}
        </button>
        
        <a
          href={`/provider/${signal.providerAddress}`}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <span>👤</span> View Provider
        </a>

        <button
          onClick={() => {
            const farcasterText = `${signal.action} ${signal.token} signal: ${signal.reasoning.slice(0, 100)}... 

${typeof window !== 'undefined' ? window.location.href : ''}`;
            const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(farcasterText)}`;
            window.open(farcasterUrl, '_blank');
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <span>🟣</span> Farcaster
        </button>
      </div>

      {/* Performance badges for successful signals */}
      {signal.status === 'closed' && signal.pnlPct && signal.pnlPct > 0 && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span>🎯</span>
            <span className="font-medium">
              Great call! +{signal.pnlPct.toFixed(1)}% profit - perfect for social media sharing
            </span>
          </div>
        </div>
      )}
    </div>
  );
}