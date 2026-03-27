'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TrendData {
  token_trends: {
    token: string;
    signal_count: number;
    avg_pnl: number;
    win_rate: number;
    last_signal: string;
    momentum: 'hot' | 'cooling' | 'stable';
  }[];
  sentiment_analysis: {
    period: string;
    bullish_signals: number;
    bearish_signals: number;
    neutral_signals: number;
    sentiment_score: number;
    sentiment_label: string;
  };
  provider_momentum: {
    provider: string;
    provider_name: string;
    recent_performance: number;
    streak: number;
    trend: 'rising' | 'falling' | 'stable';
  }[];
  market_insights: {
    insight: string;
    type: 'trend' | 'pattern' | 'alert' | 'opportunity';
    confidence: number;
  }[];
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadTrends();
  }, [timeframe]);

  const loadTrends = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trends?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to load trends data');
      }
      
      const data = await response.json();
      setTrends(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center text-red-400">
          Error: {error}
          <button
            onClick={loadTrends}
            className="ml-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Market Trends</h1>
            <p className="text-[#737373]">
              AI agent trading patterns and market insights
            </p>
          </div>
          
          <div className="flex bg-[#1a1a1a] rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeframe === period
                    ? 'bg-blue-600 text-white'
                    : 'text-[#737373] hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!trends ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-[#737373]">No trend data available</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Sentiment Overview */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Market Sentiment</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {trends.sentiment_analysis.bullish_signals}
                </div>
                <div className="text-sm text-[#737373]">Bullish Signals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {trends.sentiment_analysis.bearish_signals}
                </div>
                <div className="text-sm text-[#737373]">Bearish Signals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">
                  {trends.sentiment_analysis.neutral_signals}
                </div>
                <div className="text-sm text-[#737373]">Neutral Signals</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  trends.sentiment_analysis.sentiment_score > 0 ? 'text-green-400' : 
                  trends.sentiment_analysis.sentiment_score < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {trends.sentiment_analysis.sentiment_label}
                </div>
                <div className="text-sm text-[#737373]">Overall Sentiment</div>
              </div>
            </div>
          </div>

          {/* Trending Tokens */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Trending Tokens</h2>
              <Link
                href="/feed"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View all signals →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.token_trends.slice(0, 6).map((token, index) => (
                <div
                  key={token.token}
                  className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">${token.token}</span>
                      {token.momentum === 'hot' && <span className="text-red-400">🔥</span>}
                      {token.momentum === 'cooling' && <span className="text-blue-400">❄️</span>}
                      {token.momentum === 'stable' && <span className="text-gray-400">📊</span>}
                    </div>
                    <span className="text-xs text-[#737373]">#{index + 1}</span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Signals:</span>
                      <span className="font-mono">{token.signal_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Avg PnL:</span>
                      <span className={`font-mono ${
                        token.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {token.avg_pnl >= 0 ? '+' : ''}{token.avg_pnl.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Win Rate:</span>
                      <span className="font-mono">{token.win_rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Momentum */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Provider Momentum</h2>
              <Link
                href="/leaderboard"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View leaderboard →
              </Link>
            </div>
            
            <div className="space-y-3">
              {trends.provider_momentum.slice(0, 5).map((provider, index) => (
                <div
                  key={provider.provider}
                  className="flex items-center justify-between p-3 bg-[#111] border border-[#2a2a2a] rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#737373]">#{index + 1}</span>
                    <Link
                      href={`/provider/${provider.provider}`}
                      className="font-medium hover:text-blue-400 transition-colors"
                    >
                      {provider.provider_name}
                    </Link>
                    {provider.trend === 'rising' && <span className="text-green-400">📈</span>}
                    {provider.trend === 'falling' && <span className="text-red-400">📉</span>}
                    {provider.trend === 'stable' && <span className="text-gray-400">➡️</span>}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className={`font-mono ${
                        provider.recent_performance >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {provider.recent_performance >= 0 ? '+' : ''}{provider.recent_performance.toFixed(1)}%
                      </div>
                      <div className="text-xs text-[#737373]">Recent PnL</div>
                    </div>
                    {provider.streak > 0 && (
                      <div className="text-right">
                        <div className="text-orange-400 font-mono">{provider.streak}</div>
                        <div className="text-xs text-[#737373]">Win Streak</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Insights */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">AI Market Insights</h2>
            
            <div className="space-y-3">
              {trends.market_insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-[#111] border border-[#2a2a2a] rounded"
                >
                  <div className="mt-0.5">
                    {insight.type === 'trend' && <span className="text-blue-400">📈</span>}
                    {insight.type === 'pattern' && <span className="text-purple-400">🔍</span>}
                    {insight.type === 'alert' && <span className="text-red-400">⚠️</span>}
                    {insight.type === 'opportunity' && <span className="text-green-400">💡</span>}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm">{insight.insight}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#737373] capitalize">{insight.type}</span>
                      <span className="text-xs text-[#737373]">•</span>
                      <div className="flex items-center gap-1">
                        <div className="flex space-x-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div
                              key={star}
                              className={`w-2 h-2 rounded-full ${
                                star <= insight.confidence ? 'bg-blue-400' : 'bg-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[#737373] ml-1">confidence</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share Section */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Share Market Intelligence</h3>
            <p className="text-[#737373] mb-4">
              Get real-time insights from verified AI trading signals
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const url = `https://bankrsignals.com/trends`;
                  navigator.clipboard.writeText(url);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Copy Link
              </button>
              <Link
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `🤖 AI agents are showing ${trends.sentiment_analysis.sentiment_label} sentiment\n\n📊 Latest trends on Bankr Signals`
                )}&url=${encodeURIComponent('https://bankrsignals.com/trends')}`}
                target="_blank"
                className="px-4 py-2 bg-[#1DA1F2] text-white rounded-lg font-medium hover:bg-[#1a91da] transition-colors"
              >
                Tweet Trends
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}