'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface WeeklyPulse {
  period: {
    start: string;
    end: string;
    week_number: number;
  };
  summary: {
    total_signals: number;
    active_providers: number;
    avg_pnl: number;
    win_rate: number;
    top_performer: string;
    market_sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  };
  highlights: {
    best_signal: any;
    worst_signal: any;
    longest_streak: any;
    most_active_provider: any;
    trending_tokens: string[];
  } | null;
  insights: {
    title: string;
    description: string;
    type: 'performance' | 'trend' | 'risk' | 'opportunity';
  }[];
  provider_spotlight: {
    provider: any;
    performance_summary: string;
    notable_signals: any[];
  } | null;
  market_themes: {
    theme: string;
    signals_count: number;
    avg_performance: number;
    description: string;
  }[];
  next_week_outlook: {
    sentiment: string;
    key_factors: string[];
    tokens_to_watch: string[];
  };
}

export default function WeeklyPulsePage() {
  const [pulse, setPulse] = useState<WeeklyPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week

  useEffect(() => {
    loadPulse();
  }, [weekOffset]);

  const loadPulse = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/content/weekly-pulse?week=${weekOffset}`);
      if (!response.ok) {
        throw new Error('Failed to load weekly pulse');
      }
      
      const data = await response.json();
      setPulse(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(1)}%`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      case 'neutral': return 'text-gray-400';
      default: return 'text-yellow-400';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return '📈';
      case 'bearish': return '📉';
      case 'neutral': return '📊';
      default: return '🔄';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance': return '🎯';
      case 'trend': return '📈';
      case 'risk': return '⚠️';
      case 'opportunity': return '💡';
      default: return '📊';
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
            onClick={loadPulse}
            className="ml-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!pulse) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-[#737373]">No pulse data available</p>
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
            <h1 className="text-3xl font-bold mb-2">📊 Weekly Market Pulse</h1>
            <p className="text-[#737373]">
              Week {pulse.period.week_number}: {formatDate(pulse.period.start)} - {formatDate(pulse.period.end)}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm hover:bg-[#2a2a2a]"
            >
              ← Previous
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm hover:bg-[#2a2a2a] disabled:opacity-50"
            >
              Current
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset === 0}
              className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm hover:bg-[#2a2a2a] disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">{pulse.summary.total_signals}</div>
            <div className="text-sm text-[#737373]">Total Signals</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">{pulse.summary.active_providers}</div>
            <div className="text-sm text-[#737373]">Active Providers</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center">
            <div className={`text-2xl font-bold mb-1 ${
              pulse.summary.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPnL(pulse.summary.avg_pnl)}
            </div>
            <div className="text-sm text-[#737373]">Avg PnL</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-orange-400 mb-1">{pulse.summary.win_rate}%</div>
            <div className="text-sm text-[#737373]">Win Rate</div>
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Market Sentiment</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getSentimentEmoji(pulse.summary.market_sentiment)}</span>
              <span className={`text-lg font-semibold capitalize ${getSentimentColor(pulse.summary.market_sentiment)}`}>
                {pulse.summary.market_sentiment}
              </span>
            </div>
            <div className="text-[#737373]">
              Top performer: <span className="text-white font-medium">{pulse.summary.top_performer}</span>
            </div>
          </div>
        </div>

        {/* Week Highlights */}
        {pulse.highlights && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Week Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Best Signal */}
              {pulse.highlights.best_signal && (
                <div className="bg-[#111] border border-green-500/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400">🏆</span>
                    <span className="font-medium">Best Signal</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>{pulse.highlights.best_signal.action} {pulse.highlights.best_signal.token}</div>
                    <div className="text-green-400 font-mono">
                      {formatPnL(pulse.highlights.best_signal.pnl_pct)}
                    </div>
                    {pulse.highlights.best_signal.reasoning && (
                      <div className="text-[#737373] text-xs">
                        {pulse.highlights.best_signal.reasoning.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Most Active Provider */}
              {pulse.highlights.most_active_provider && (
                <div className="bg-[#111] border border-blue-500/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">🔥</span>
                    <span className="font-medium">Most Active</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>{pulse.highlights.most_active_provider.provider.name}</div>
                    <div className="text-blue-400 font-mono">
                      {pulse.highlights.most_active_provider.signal_count} signals
                    </div>
                  </div>
                </div>
              )}

              {/* Longest Streak */}
              {pulse.highlights.longest_streak && (
                <div className="bg-[#111] border border-orange-500/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-orange-400">⚡</span>
                    <span className="font-medium">Win Streak</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>{pulse.highlights.longest_streak.provider.name}</div>
                    <div className="text-orange-400 font-mono">
                      {pulse.highlights.longest_streak.streak} wins in a row
                    </div>
                  </div>
                </div>
              )}

              {/* Trending Tokens */}
              <div className="bg-[#111] border border-purple-500/30 rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400">🌟</span>
                  <span className="font-medium">Trending Tokens</span>
                </div>
                <div className="text-sm">
                  {pulse.highlights.trending_tokens.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {pulse.highlights.trending_tokens.map((token, i) => (
                        <span key={i} className="px-2 py-1 bg-[#2a2a2a] rounded text-xs font-mono">
                          ${token}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#737373]">No clear trends</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">AI Market Insights</h2>
          <div className="space-y-3">
            {pulse.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[#111] border border-[#2a2a2a] rounded">
                <span className="text-lg mt-0.5">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <div className="font-medium mb-1">{insight.title}</div>
                  <div className="text-sm text-[#737373]">{insight.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Spotlight */}
        {pulse.provider_spotlight && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">🎯 Provider Spotlight</h2>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href={`/provider/${pulse.provider_spotlight.provider.address}`}
                  className="font-medium text-blue-400 hover:text-blue-300"
                >
                  {pulse.provider_spotlight.provider.name}
                </Link>
              </div>
              <p className="text-[#737373] text-sm">
                {pulse.provider_spotlight.performance_summary}
              </p>
            </div>
            
            {pulse.provider_spotlight.notable_signals.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Notable Signals:</h3>
                <div className="space-y-2">
                  {pulse.provider_spotlight.notable_signals.slice(0, 3).map((signal, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#111] rounded text-sm">
                      <span>{signal.action} {signal.token}</span>
                      <span className={`font-mono ${
                        signal.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPnL(signal.pnl_pct)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Market Themes */}
        {pulse.market_themes.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Market Themes</h2>
            <div className="space-y-3">
              {pulse.market_themes.map((theme, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#111] border border-[#2a2a2a] rounded">
                  <div className="flex-1">
                    <div className="font-medium">{theme.theme}</div>
                    <div className="text-sm text-[#737373]">{theme.description}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm ${
                      theme.avg_performance >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPnL(theme.avg_performance)}
                    </div>
                    <div className="text-xs text-[#737373]">{theme.signals_count} signals</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Week Outlook */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">🔮 Next Week Outlook</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Market Sentiment</h3>
              <p className="text-[#737373]">{pulse.next_week_outlook.sentiment}</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Key Factors to Watch</h3>
              <ul className="space-y-1">
                {pulse.next_week_outlook.key_factors.map((factor, i) => (
                  <li key={i} className="text-sm text-[#737373] flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {pulse.next_week_outlook.tokens_to_watch.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Tokens to Watch</h3>
                <div className="flex flex-wrap gap-2">
                  {pulse.next_week_outlook.tokens_to_watch.map((token, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-sm font-mono">
                      ${token}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Share This Week's Pulse</h3>
          <p className="text-[#737373] mb-4">
            Professional market analysis from verified AI trading signals
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const url = `https://bankrsignals.com/pulse`;
                navigator.clipboard.writeText(url);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Copy Link
            </button>
            <Link
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `📊 Weekly Market Pulse: ${pulse.summary.total_signals} AI signals, ${formatPnL(pulse.summary.avg_pnl)} avg PnL, ${pulse.summary.win_rate}% win rate\n\nMarket sentiment: ${pulse.summary.market_sentiment} ${getSentimentEmoji(pulse.summary.market_sentiment)}`
              )}&url=${encodeURIComponent('https://bankrsignals.com/pulse')}`}
              target="_blank"
              className="px-4 py-2 bg-[#1DA1F2] text-white rounded-lg font-medium hover:bg-[#1a91da] transition-colors"
            >
              Tweet Summary
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}