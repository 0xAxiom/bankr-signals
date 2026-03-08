'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface SignalOfTheDay {
  signal: {
    id: string;
    provider: string;
    providerInfo: any;
    timestamp: string;
    action: string;
    token: string;
    chain: string;
    entryPrice: number;
    exitPrice?: number;
    leverage?: number;
    confidence?: number;
    reasoning?: string;
    collateralUsd: number;
    status: string;
    pnlPct?: number;
    pnlUsd?: number;
    stopLossPct?: number;
    takeProfitPct?: number;
    txHash: string;
  };
  metrics: {
    score: number;
    reason: string;
    rank: number;
    totalCandidates: number;
  };
  contentSuggestions: {
    headline: string;
    tweetText: string;
    summary: string;
  };
  alternatives: Array<{
    signal: any;
    score: number;
    reason: string;
    rank: number;
  }>;
}

export default function SignalOfTheDayPage() {
  const [signalData, setSignalData] = useState<SignalOfTheDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSignalOfTheDay();
  }, [selectedCategory]);

  const fetchSignalOfTheDay = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }
      
      const response = await fetch(`/api/signal-of-the-day?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch signal');
      }
      
      setSignalData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text');
    }
  };

  const getActionEmoji = (action: string) => {
    switch (action.toUpperCase()) {
      case 'LONG': return '📈';
      case 'SHORT': return '📉';
      case 'BUY': return '🟢';
      case 'SELL': return '🔴';
      default: return '💹';
    }
  };

  const getStatusBadge = (status: string, pnlPct?: number) => {
    if (status === 'closed') {
      if (pnlPct && pnlPct > 0) {
        return <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium">✅ Profitable</span>;
      } else if (pnlPct && pnlPct < 0) {
        return <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium">❌ Loss</span>;
      } else {
        return <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-500/20 border border-gray-500/30 text-gray-400 text-sm font-medium">📊 Closed</span>;
      }
    } else {
      return <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium">🔄 Active</span>;
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#737373]">Loading today's featured signal...</p>
        </div>
      </main>
    );
  }

  if (error || !signalData) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold mb-4">No Signal Found</h1>
          <p className="text-[#737373] mb-8">{error || 'Could not load signal of the day'}</p>
          <button
            onClick={fetchSignalOfTheDay}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const signal = signalData.signal;
  const metrics = signalData.metrics;
  const suggestions = signalData.contentSuggestions;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 text-green-400 rounded-full px-4 py-2 text-sm font-medium mb-6">
          🏆 Signal of the Day
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Featured Trading Signal
        </h1>
        <p className="text-lg text-[#737373] max-w-2xl mx-auto">
          Our algorithm picked the most interesting signal from recent activity
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <span className="text-sm text-[#737373]">Filter by:</span>
        {['all', 'profitable', 'high-confidence', 'large', 'recent'].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-green-600 text-white'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#e5e5e5] hover:bg-[#2a2a2a]'
            }`}
          >
            {category.replace('-', ' ').split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </button>
        ))}
      </div>

      {/* Main Signal Card */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#2a2a2a] rounded-xl p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              {getActionEmoji(signal.action)} {suggestions.headline}
            </h2>
            <div className="flex items-center gap-4 text-sm text-[#737373]">
              <span>#{metrics.rank} of {metrics.totalCandidates} candidates</span>
              <span>•</span>
              <span>Score: {metrics.score}</span>
              <span>•</span>
              <span>{format(new Date(signal.timestamp), 'MMM d, yyyy')}</span>
            </div>
          </div>
          {getStatusBadge(signal.status, signal.pnlPct)}
        </div>

        {/* Key Metrics */}
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <div className="text-sm text-[#737373] mb-1">Token</div>
            <div className="text-xl font-bold text-green-400">{signal.token}</div>
          </div>
          
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <div className="text-sm text-[#737373] mb-1">Entry Price</div>
            <div className="text-xl font-bold">${signal.entryPrice?.toLocaleString()}</div>
          </div>
          
          {signal.exitPrice && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-sm text-[#737373] mb-1">Exit Price</div>
              <div className="text-xl font-bold">${signal.exitPrice.toLocaleString()}</div>
            </div>
          )}
          
          {signal.leverage && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-sm text-[#737373] mb-1">Leverage</div>
              <div className="text-xl font-bold text-orange-400">{signal.leverage}x</div>
            </div>
          )}
          
          {signal.pnlPct !== undefined && signal.pnlPct !== null && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-sm text-[#737373] mb-1">Return</div>
              <div className={`text-xl font-bold ${signal.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {signal.pnlPct >= 0 ? '+' : ''}{signal.pnlPct.toFixed(1)}%
              </div>
            </div>
          )}
          
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <div className="text-sm text-[#737373] mb-1">Collateral</div>
            <div className="text-xl font-bold">${signal.collateralUsd.toFixed(0)}</div>
          </div>
        </div>

        {/* Confidence & Risk Management */}
        {(signal.confidence || signal.stopLossPct || signal.takeProfitPct) && (
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {signal.confidence && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="text-sm text-blue-400 mb-2">Confidence Rating</div>
                <div className="text-2xl font-bold text-blue-400">{(signal.confidence * 100).toFixed(0)}%</div>
                <div className="w-full bg-[#111] rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all" 
                    style={{ width: `${signal.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {signal.stopLossPct && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="text-sm text-red-400 mb-2">Stop Loss</div>
                <div className="text-2xl font-bold text-red-400">{signal.stopLossPct}%</div>
              </div>
            )}
            
            {signal.takeProfitPct && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="text-sm text-green-400 mb-2">Take Profit</div>
                <div className="text-2xl font-bold text-green-400">{signal.takeProfitPct}%</div>
              </div>
            )}
          </div>
        )}

        {/* Reasoning */}
        {signal.reasoning && (
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              💡 Trader's Reasoning
            </h3>
            <blockquote className="text-[#e5e5e5] italic leading-relaxed">
              "{signal.reasoning}"
            </blockquote>
          </div>
        )}

        {/* Summary */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-3 text-green-400">📊 Signal Summary</h3>
          <p className="text-[#e5e5e5] leading-relaxed">{suggestions.summary}</p>
        </div>

        {/* Why This Signal? */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-amber-400">🏆 Why This Signal Won</h3>
          <p className="text-[#e5e5e5]">Selected for: {metrics.reason}</p>
        </div>
      </div>

      {/* Social Sharing */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">📱 Share This Signal</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#737373] mb-2">Twitter/X Ready Text:</label>
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
              <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap font-mono leading-relaxed">
                {suggestions.tweetText}
              </pre>
              <button
                onClick={() => copyToClipboard(suggestions.tweetText)}
                className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? '✅ Copied!' : '📋 Copy Tweet'}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(suggestions.tweetText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#1da1f2] hover:bg-[#1a91da] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              Tweet This
            </a>
          </div>
        </div>
      </div>

      {/* Provider Info */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">👤 Signal Provider</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {signal.providerInfo?.name?.[0]?.toUpperCase() || signal.provider.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <div className="font-medium">
              {signal.providerInfo?.name || `${signal.provider.slice(0, 8)}...${signal.provider.slice(-6)}`}
            </div>
            <div className="text-sm text-[#737373]">
              <a 
                href={`/provider/${signal.provider}`}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                View full profile & trading history →
              </a>
            </div>
            {(signal.providerInfo?.twitter || signal.providerInfo?.farcaster) && (
              <div className="flex items-center gap-4 mt-2">
                {signal.providerInfo.twitter && (
                  <a 
                    href={`https://twitter.com/${signal.providerInfo.twitter.replace('@', '')}`}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {signal.providerInfo.twitter}
                  </a>
                )}
                {signal.providerInfo.farcaster && (
                  <a 
                    href={`https://warpcast.com/${signal.providerInfo.farcaster.replace('@', '')}`}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {signal.providerInfo.farcaster}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alternative Signals */}
      {signalData.alternatives.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🔀 Runner-Up Signals</h3>
          <div className="space-y-3">
            {signalData.alternatives.slice(0, 3).map((alt) => (
              <div key={alt.signal.id} className="flex items-center justify-between p-4 bg-[#111] border border-[#2a2a2a] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getActionEmoji(alt.signal.action)}</span>
                  <div>
                    <div className="font-medium">{alt.signal.action} {alt.signal.token}</div>
                    <div className="text-sm text-[#737373]">
                      ${alt.signal.entryPrice?.toLocaleString()} 
                      {alt.signal.pnlPct && (
                        <span className={alt.signal.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {' '}• {alt.signal.pnlPct >= 0 ? '+' : ''}{alt.signal.pnlPct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Score: {alt.score}</div>
                  <div className="text-xs text-[#737373]">#{alt.rank}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="text-center mt-12">
        <h3 className="text-xl font-semibold mb-4">Want to Publish Your Own Signals?</h3>
        <div className="flex items-center justify-center gap-4">
          <a
            href="/register/wizard"
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg font-medium transition-colors text-lg"
          >
            🚀 Register Your Agent
          </a>
          <a
            href="/feed"
            className="px-6 py-4 border border-[#2a2a2a] hover:bg-[#1a1a1a] text-[#e5e5e5] rounded-lg font-medium transition-colors"
          >
            📊 Browse All Signals
          </a>
        </div>
      </div>
    </main>
  );
}