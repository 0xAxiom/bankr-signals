'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Award, Activity, DollarSign, Users, Share2, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WeeklyStats {
  bestPerformer: {
    name: string;
    address: string;
    weeklyPnl: number;
    winRate: number;
    signals: number;
  } | null;
  highestTrade: {
    provider: string;
    token: string;
    pnlPct: number;
    action: string;
  } | null;
  mostActive: {
    name: string;
    address: string;
    signals: number;
  } | null;
  platformStats: {
    totalSignals: number;
    totalProviders: number;
    activeProviders: number;
    totalPnl: number;
    avgWinRate: number;
  };
  weekRange: string;
}

export default function WeeklyRecapPage() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWeeklyStats();
  }, []);

  const fetchWeeklyStats = async () => {
    try {
      const response = await fetch('/api/recap/weekly');
      if (!response.ok) {
        throw new Error('Failed to fetch weekly recap');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch weekly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTweetText = () => {
    if (!stats) return "";
    
    const { bestPerformer, highestTrade, platformStats } = stats;
    
    return `📊 Bankr Signals Weekly Recap (${stats.weekRange})

🏆 Top Performer: ${bestPerformer?.name} (+${bestPerformer?.weeklyPnl}%)
🚀 Best Trade: ${highestTrade?.action} ${highestTrade?.token} (+${highestTrade?.pnlPct}%)
📈 Platform Stats: ${platformStats.totalSignals} signals, ${platformStats.activeProviders} active traders

All verified onchain 🔗 bankrsignals.com`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Analyzing this week's trading performance...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p>Unable to load weekly recap. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            Weekly Trading Recap
          </h1>
          <p className="text-xl text-gray-400 mb-2">{stats.weekRange}</p>
          <p className="text-gray-500">Verified onchain signal performance</p>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Best Performer */}
          <Card className="bg-gradient-to-br from-green-900/20 to-green-700/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-6 h-6 text-green-400" />
                <h3 className="font-semibold text-green-400">Top Performer</h3>
              </div>
              {stats.bestPerformer ? (
                <div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {stats.bestPerformer.name}
                  </div>
                  <div className="text-green-300 text-lg font-semibold">
                    +{stats.bestPerformer.weeklyPnl}%
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    {stats.bestPerformer.signals} signals • {stats.bestPerformer.winRate}% win rate
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No data this week</div>
              )}
            </CardContent>
          </Card>

          {/* Highest Trade */}
          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-700/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-blue-400" />
                <h3 className="font-semibold text-blue-400">Best Trade</h3>
              </div>
              {stats.highestTrade ? (
                <div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {stats.highestTrade.action} {stats.highestTrade.token}
                  </div>
                  <div className="text-blue-300 text-lg font-semibold">
                    +{stats.highestTrade.pnlPct}%
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    by {stats.highestTrade.provider}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No trades this week</div>
              )}
            </CardContent>
          </Card>

          {/* Most Active */}
          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-700/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-6 h-6 text-purple-400" />
                <h3 className="font-semibold text-purple-400">Most Active</h3>
              </div>
              {stats.mostActive ? (
                <div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {stats.mostActive.name}
                  </div>
                  <div className="text-purple-300 text-lg font-semibold">
                    {stats.mostActive.signals} signals
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    Consistent trading activity
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No activity this week</div>
              )}
            </CardContent>
          </Card>

          {/* Platform Growth */}
          <Card className="bg-gradient-to-br from-orange-900/20 to-orange-700/20 border-orange-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-6 h-6 text-orange-400" />
                <h3 className="font-semibold text-orange-400">Platform</h3>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stats.platformStats.activeProviders}/{stats.platformStats.totalProviders}
                </div>
                <div className="text-orange-300 text-lg font-semibold">
                  Active traders
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {stats.platformStats.totalSignals} total signals
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Performance */}
        <Card className="bg-gray-900/50 border-gray-700 mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6">Performance Breakdown</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Platform Metrics */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-300">Platform Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400">Total Signals This Week</span>
                    <span className="font-semibold text-white">{stats.platformStats.totalSignals}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400">Average Win Rate</span>
                    <span className="font-semibold text-green-400">{stats.platformStats.avgWinRate}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400">Total Platform PnL</span>
                    <span className="font-semibold text-green-400">${stats.platformStats.totalPnl.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Top Performers */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-300">This Week's Highlights</h3>
                <div className="space-y-4">
                  {stats.bestPerformer && (
                    <div className="p-4 bg-gradient-to-r from-green-900/20 to-green-800/20 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium">Top Performer</span>
                      </div>
                      <div className="text-white font-semibold">{stats.bestPerformer.name}</div>
                      <div className="text-sm text-gray-400">
                        +{stats.bestPerformer.weeklyPnl}% across {stats.bestPerformer.signals} signals
                      </div>
                    </div>
                  )}
                  
                  {stats.highestTrade && (
                    <div className="p-4 bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 font-medium">Best Single Trade</span>
                      </div>
                      <div className="text-white font-semibold">
                        {stats.highestTrade.action} {stats.highestTrade.token}
                      </div>
                      <div className="text-sm text-gray-400">
                        +{stats.highestTrade.pnlPct}% gain by {stats.highestTrade.provider}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Sharing */}
        <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Share2 className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Share This Week's Recap</h2>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {generateTweetText()}
              </pre>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(generateTweetText())}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
              
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(generateTweetText())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Tweet
              </a>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-400 mb-4">Want to appear in next week's recap?</p>
          <div className="flex justify-center gap-4">
            <a
              href="/register"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Register as Provider
            </a>
            <a
              href="/leaderboard"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              View Leaderboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}