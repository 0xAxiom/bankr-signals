'use client';

import { useEffect, useState } from 'react';
import { Signal } from '@/lib/types';
import Image from 'next/image';
import { useParams } from 'next/navigation';

export default function SignalSharePage() {
  const params = useParams();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchSignal(params.id as string);
    }
  }, [params?.id]);

  const fetchSignal = async (id: string) => {
    try {
      const response = await fetch(`/api/signals/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSignal(data);
      }
    } catch (error) {
      console.error('Error fetching signal:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyShareUrl = async () => {
    const url = `${window.location.origin}/signal/${params?.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL');
    }
  };

  const shareToTwitter = () => {
    if (!signal) return;
    
    const pnlText = signal.pnlPct !== null ? ` | ${signal.pnlPct > 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}% PnL` : '';
    const confidenceText = signal.confidence ? ` | ${Math.round(signal.confidence * 100)}% confidence` : '';
    const leverageText = signal.leverage ? ` ${signal.leverage}x` : '';
    
    const text = `🚀 ${signal.action}${leverageText} $${signal.token} at $${signal.entry_price}${pnlText}${confidenceText}

"${signal.reasoning || 'Strong technical setup'}"

by ${signal.provider_name} on @BankrSignals

#DeFi #Trading #Signals`;

    const url = `${window.location.origin}/signal/${params?.id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="animate-pulse">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg h-64"></div>
        </div>
      </main>
    );
  }

  if (!signal) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Signal Not Found</h1>
          <a href="/feed" className="text-blue-400 hover:text-blue-300">← Back to Feed</a>
        </div>
      </main>
    );
  }

  const isProfitable = signal.pnlPct !== null && signal.pnlPct > 0;
  const isLoss = signal.pnlPct !== null && signal.pnlPct < 0;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Signal Card */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
              signal.action === 'LONG' 
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : 'bg-red-500/20 border border-red-500/40 text-red-400'
            }`}>
              {signal.action === 'LONG' ? '📈' : '📉'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {signal.action} ${signal.token}
                {signal.leverage && <span className="text-lg text-[#737373]"> {signal.leverage}x</span>}
              </h1>
              <div className="text-[#737373]">
                Entry: ${signal.entry_price}
                {signal.exit_price && <span> | Exit: ${signal.exit_price}</span>}
              </div>
            </div>
          </div>
          
          {signal.pnlPct !== null && (
            <div className={`text-right ${
              isProfitable ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-[#737373]'
            }`}>
              <div className="text-3xl font-bold">
                {signal.pnlPct > 0 ? '+' : ''}{signal.pnlPct.toFixed(1)}%
              </div>
              <div className="text-sm">PnL</div>
            </div>
          )}
        </div>

        {signal.reasoning && (
          <div className="mb-6">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-sm text-[#737373] mb-2">Reasoning</div>
              <div className="text-[#e5e5e5]">"{signal.reasoning}"</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#111] rounded-lg p-3">
            <div className="text-xs text-[#737373] mb-1">Provider</div>
            <div className="text-sm font-medium">{signal.provider_name}</div>
          </div>
          
          {signal.confidence && (
            <div className="bg-[#111] rounded-lg p-3">
              <div className="text-xs text-[#737373] mb-1">Confidence</div>
              <div className="text-sm font-medium">{Math.round(signal.confidence * 100)}%</div>
            </div>
          )}
          
          <div className="bg-[#111] rounded-lg p-3">
            <div className="text-xs text-[#737373] mb-1">Status</div>
            <div className="text-sm font-medium capitalize">
              {signal.status === 'open' ? '🔄 Open' : '✅ Closed'}
            </div>
          </div>
          
          <div className="bg-[#111] rounded-lg p-3">
            <div className="text-xs text-[#737373] mb-1">Date</div>
            <div className="text-sm font-medium">
              {new Date(signal.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="flex items-center gap-4 pt-6 border-t border-[#2a2a2a]">
          <button
            onClick={shareToTwitter}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            🐦 Share on Twitter
          </button>
          
          <button
            onClick={copyShareUrl}
            className={`flex items-center gap-2 px-6 py-3 border border-[#2a2a2a] rounded-lg font-medium transition-colors ${
              copied 
                ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                : 'text-[#e5e5e5] hover:bg-[#222]'
            }`}
          >
            {copied ? '✅ Copied!' : '🔗 Copy Link'}
          </button>
          
          <a
            href={`/provider/${signal.provider}`}
            className="text-[#737373] hover:text-[#e5e5e5] transition-colors"
          >
            View Provider →
          </a>
        </div>
      </div>

      {/* Provider Info */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">About {signal.provider_name}</h3>
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#737373]">
            Provider on Bankr Signals • Base Network
          </div>
          <a
            href={`/provider/${signal.provider}`}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            View Full Profile →
          </a>
        </div>
      </div>

      {/* Back to Feed */}
      <div className="text-center mt-8">
        <a
          href="/feed"
          className="inline-flex items-center gap-2 text-[#737373] hover:text-[#e5e5e5] transition-colors"
        >
          ← Back to Live Feed
        </a>
      </div>
    </main>
  );
}