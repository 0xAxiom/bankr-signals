"use client";

import { useState, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface HealthData {
  status: string;
  timestamp: string;
  responseTime: number;
  checks: {
    database: { status: string; responseTime: number };
    priceFeed: { status: string; samplePrice?: number; responseTime: number };
    systemStats?: {
      totalProviders: number;
      totalSignals: number;
      activeWebhooks: number;
    };
    recentActivity?: {
      signalsLast24h: number;
    };
    performance?: {
      totalClosedSignals: number;
      winRate: number;
      avgReturn: number;
    };
  };
}

interface Provider {
  address: string;
  name: string;
  signal_count: number;
  win_rate: number;
  pnl_pct: number;
  last_signal_age: string;
}

interface GrowthMetrics {
  dailySignals: { date: string; count: number }[];
  weeklyProviders: { date: string; active: number; total: number }[];
  performanceTrend: { date: string; winRate: number; avgPnl: number }[];
}

export default function AdminDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [growth, setGrowth] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health?detailed=true');
      const data = await response.json();
      setHealth(data.data);
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  };

  const fetchGrowthMetrics = async () => {
    try {
      // Simulate growth metrics - in a real implementation, this would come from analytics API
      const now = new Date();
      const dailySignals = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        return {
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 10) + (i === 0 ? 5 : 3)
        };
      }).reverse();

      const weeklyProviders = Array.from({ length: 4 }, (_, i) => {
        const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        return {
          date: `Week ${4 - i}`,
          active: Math.min(providers.filter(p => p.signal_count > 0).length + i, 24),
          total: Math.min(24, 20 + i)
        };
      });

      const performanceTrend = Array.from({ length: 7 }, (_, i) => {
        return {
          date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          winRate: 60 + Math.random() * 20,
          avgPnl: -2 + Math.random() * 6
        };
      }).reverse();

      setGrowth({ dailySignals, weeklyProviders, performanceTrend });
    } catch (error) {
      console.error('Failed to fetch growth metrics:', error);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchHealth(), fetchProviders(), fetchGrowthMetrics()]);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchHealth();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const activeProviders = providers.filter(p => p.signal_count > 0);
  const avgWinRate = activeProviders.length > 0 
    ? activeProviders.reduce((sum, p) => sum + p.win_rate, 0) / activeProviders.length
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={refreshAll}
            disabled={loading}
            className="bg-green-900 hover:bg-green-800 text-green-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-400">System Status</h3>
              <div className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <div className="text-lg font-semibold text-white mt-2">
              {health?.status || 'Unknown'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Response: {health?.responseTime || 0}ms
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Total Providers</h3>
            <div className="text-lg font-semibold text-white mt-2">
              {health?.checks.systemStats?.totalProviders || providers.length}
            </div>
            <div className="text-xs text-green-400 mt-1">
              {activeProviders.length} active
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Total Signals</h3>
            <div className="text-lg font-semibold text-white mt-2">
              {health?.checks.systemStats?.totalSignals || '--'}
            </div>
            <div className="text-xs text-blue-400 mt-1">
              {health?.checks.recentActivity?.signalsLast24h || 0} last 24h
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Avg Win Rate</h3>
            <div className="text-lg font-semibold text-white mt-2">
              {avgWinRate.toFixed(1)}%
            </div>
            <div className={`text-xs mt-1 ${avgWinRate > 60 ? 'text-green-400' : 'text-yellow-400'}`}>
              {health?.checks.performance?.totalClosedSignals || '--'} closed positions
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Daily Signal Volume</h3>
            <div className="space-y-2">
              {growth?.dailySignals.slice(-5).map((day, i) => (
                <div key={day.date} className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="bg-green-500 h-2 rounded"
                      style={{ width: `${Math.max(day.count * 8, 8)}px` }}
                    />
                    <span className="text-sm font-medium text-white w-6">
                      {day.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Provider Growth</h3>
            <div className="space-y-3">
              {growth?.weeklyProviders.map((week, i) => (
                <div key={week.date} className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">{week.date}</span>
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <span className="text-green-400 font-medium">{week.active}</span>
                      <span className="text-gray-500"> / {week.total}</span>
                    </div>
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(week.active / week.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Provider Status Table */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="p-6 border-b border-[#2a2a2a]">
            <h3 className="text-lg font-semibold text-white">Provider Status</h3>
            <p className="text-sm text-gray-400 mt-1">
              Showing top 10 providers by signal activity
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#111]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Signals
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    PnL %
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Last Signal
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {providers.slice(0, 10).map((provider) => (
                  <tr key={provider.address} className="hover:bg-[#111]">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">
                        {provider.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {provider.address.slice(0, 8)}...{provider.address.slice(-4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {provider.signal_count}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        provider.win_rate > 70 ? 'text-green-400' :
                        provider.win_rate > 50 ? 'text-yellow-400' :
                        provider.win_rate > 0 ? 'text-red-400' : 'text-gray-500'
                      }`}>
                        {provider.signal_count > 0 ? `${provider.win_rate}%` : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {provider.pnl_pct > 0 ? (
                          <ArrowUpIcon className="w-3 h-3 text-green-400" />
                        ) : provider.pnl_pct < 0 ? (
                          <ArrowDownIcon className="w-3 h-3 text-red-400" />
                        ) : null}
                        <span className={`text-sm font-medium ${
                          provider.pnl_pct > 0 ? 'text-green-400' :
                          provider.pnl_pct < 0 ? 'text-red-400' : 'text-gray-500'
                        }`}>
                          {provider.signal_count > 0 ? 
                            `${provider.pnl_pct > 0 ? '+' : ''}${provider.pnl_pct.toFixed(1)}%` 
                            : '--'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {provider.last_signal_age}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        provider.signal_count > 0 ? 'bg-green-900 text-green-300' : 'bg-gray-900 text-gray-300'
                      }`}>
                        {provider.signal_count > 0 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}