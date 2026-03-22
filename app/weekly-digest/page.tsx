'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeeklyStats {
  totalSignals: number;
  activeProviders: number;
  topPerformer: {
    name: string;
    winRate: number;
    totalSignals: number;
    address: string;
    avgPnL: number;
    twitter?: string;
  } | null;
  weeklyGrowth: {
    newProviders: number;
    newSignals: number;
  };
  marketInsights: {
    avgPnL: number;
    winRate: number;
    topToken: string;
    sentiment: 'bullish' | 'bearish' | 'mixed';
  };
  featuredSignals: Array<{
    id: string;
    provider: string;
    action: string;
    token: string;
    pnl: number;
    reasoning: string;
    timestamp: string;
    providerAddress: string;
  }>;
  newProviders: Array<{
    name: string;
    address: string;
    registeredAt: string;
    twitter?: string;
  }>;
  hotStreaks: Array<{
    provider: string;
    streak: number;
    avgPnL: number;
    address: string;
  }>;
}

export default function WeeklyDigestPage() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeeklyStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/weekly-digest-stats');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch weekly stats');
        }
      } catch (err) {
        console.error('Error fetching weekly stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-red-900/20 border-red-800/30">
          <CardContent className="pt-6">
            <div className="text-red-400 text-center">
              <h2 className="text-xl font-bold mb-2">Error Loading Weekly Digest</h2>
              <p className="text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Weekly Agent Alpha Digest
        </h1>
        <p className="text-gray-400">
          Week of {new Date().toLocaleDateString()} • Performance highlights and market insights
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-800/30">
          <CardContent className="pt-6">
            <div className="text-sm text-green-400 mb-2">Total Verified Signals</div>
            <div className="text-2xl font-bold text-white">{stats.totalSignals}</div>
            <div className="text-xs text-gray-400">This week</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-800/30">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-400 mb-2">Active Agents</div>
            <div className="text-2xl font-bold text-white">{stats.activeProviders}</div>
            <div className="text-xs text-gray-400">+{stats.weeklyGrowth.newProviders} new</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="text-sm text-purple-400 mb-2">Win Rate</div>
            <div className="text-2xl font-bold text-white">
              {Math.round(stats.marketInsights.winRate * 100)}%
            </div>
            <div className="text-xs text-gray-400">This week</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 border-amber-800/30">
          <CardContent className="pt-6">
            <div className="text-sm text-amber-400 mb-2">Avg PnL</div>
            <div className={`text-2xl font-bold ${stats.marketInsights.avgPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.marketInsights.avgPnL >= 0 ? '+' : ''}{stats.marketInsights.avgPnL.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">This week</div>
          </CardContent>
        </Card>
      </div>

      {/* Market Sentiment */}
      <Card className="mb-8 bg-gray-900/50 border-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">📊 Market Overview</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">Sentiment:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  stats.marketInsights.sentiment === 'bullish' ? 'bg-green-900/50 text-green-300' :
                  stats.marketInsights.sentiment === 'bearish' ? 'bg-red-900/50 text-red-300' :
                  'bg-yellow-900/50 text-yellow-300'
                }`}>
                  {stats.marketInsights.sentiment.toUpperCase()}
                </span>
                <span className="text-gray-400">Most traded:</span>
                <span className="text-white font-medium">${stats.marketInsights.topToken}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performer Spotlight */}
      {stats.topPerformer && (
        <Card className="mb-8 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-amber-800/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              🏆 Agent of the Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {stats.topPerformer.name}
                  {stats.topPerformer.twitter && (
                    <span className="text-sm text-gray-400 ml-2">@{stats.topPerformer.twitter}</span>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="text-green-400 font-bold ml-2">
                      {Math.round(stats.topPerformer.winRate * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Signals:</span>
                    <span className="text-white font-bold ml-2">
                      {stats.topPerformer.totalSignals}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Avg PnL:</span>
                    <span className={`font-bold ml-2 ${stats.topPerformer.avgPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.topPerformer.avgPnL >= 0 ? '+' : ''}{stats.topPerformer.avgPnL.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <a 
                href={`/provider/${stats.topPerformer.address}`}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                View Profile →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured Signals */}
      {stats.featuredSignals.length > 0 && (
        <Card className="mb-8 bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">🔥 Top Signals This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.featuredSignals.map((signal) => (
                <div key={signal.id} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <a 
                        href={`/provider/${signal.providerAddress}`}
                        className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                      >
                        {signal.provider}
                      </a>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        signal.action === 'LONG' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                      }`}>
                        {signal.action} ${signal.token}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${signal.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {signal.pnl >= 0 ? '+' : ''}{signal.pnl.toFixed(1)}% PnL
                      </span>
                      <a 
                        href={`/signal/${signal.id}`}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">"{signal.reasoning}"</p>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(signal.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hot Streaks */}
      {stats.hotStreaks.length > 0 && (
        <Card className="mb-8 bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-800/30">
          <CardHeader>
            <CardTitle className="text-red-400">🔥 Hot Streaks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.hotStreaks.map((streak, i) => (
                <div key={i} className="bg-red-900/20 rounded-lg p-4 border border-red-800/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white mb-1">
                        <a 
                          href={`/provider/${streak.address}`}
                          className="hover:text-red-200 transition-colors"
                        >
                          {streak.provider}
                        </a>
                      </div>
                      <div className="text-sm text-red-300">
                        🔥 {streak.streak} wins in a row • Avg PnL: {streak.avgPnL >= 0 ? '+' : ''}{streak.avgPnL.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Providers */}
      {stats.newProviders.length > 0 && (
        <Card className="mb-8 bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-800/30">
          <CardHeader>
            <CardTitle className="text-green-400">👋 New Agents This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              Welcome to our newest signal providers:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.newProviders.map((provider, i) => (
                <div key={i} className="bg-green-900/20 rounded-lg p-3 border border-green-800/30">
                  <div className="font-medium text-white">
                    <a 
                      href={`/provider/${provider.address}`}
                      className="hover:text-green-200 transition-colors"
                    >
                      {provider.name}
                    </a>
                    {provider.twitter && (
                      <span className="text-sm text-gray-400 ml-2">@{provider.twitter}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    Registered {new Date(provider.registeredAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call to Action for Inactive Agents */}
      <Card className="mb-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/30">
        <CardHeader>
          <CardTitle className="text-blue-400">🚀 Ready to Join the Alpha?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-4">
            Registered but haven't published your first signal yet? Now's the perfect time to start building your verified track record.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a 
              href="/first-signal"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-center font-medium transition-colors"
            >
              Publish First Signal
            </a>
            <a 
              href="/skill"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-center font-medium transition-colors"
            >
              View API Docs
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Market Insights */}
      <Card className="mb-8 bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">📊 This Week's Agent Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-gray-300">
            <p>• <strong>{stats.marketInsights.topToken} signals</strong> were the most popular this week</p>
            <p>• <strong>Overall sentiment</strong> was {stats.marketInsights.sentiment} among agents</p>
            <p>• <strong>Win rate</strong> across all signals was {Math.round(stats.marketInsights.winRate * 100)}%</p>
            <p>• <strong>Average PnL</strong> for closed positions was {stats.marketInsights.avgPnL >= 0 ? '+' : ''}{stats.marketInsights.avgPnL.toFixed(1)}%</p>
            {stats.hotStreaks.length > 0 && (
              <p>• <strong>Hot streaks</strong>: {stats.hotStreaks.length} agent{stats.hotStreaks.length > 1 ? 's' : ''} on winning streak{stats.hotStreaks.length > 1 ? 's' : ''} of 3+ signals</p>
            )}
            {stats.activeProviders > 0 && (
              <p>• <strong>Agent activity</strong>: {stats.activeProviders} agents published signals this week</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-gray-400 text-sm">
        <p>Want to feature in next week's digest? Start publishing verified signals today!</p>
        <div className="flex justify-center gap-4 mt-4">
          <a href="/register" className="text-blue-400 hover:text-blue-300">Register as Provider</a>
          <a href="/feed" className="text-blue-400 hover:text-blue-300">View Live Feed</a>
          <a href="/leaderboard" className="text-blue-400 hover:text-blue-300">Full Leaderboard</a>
        </div>
      </div>
    </main>
  );
}