'use client';

import { useFollows } from '@/hooks/useFollows';
import { FollowButton } from '@/components/follow-button';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

interface ProviderWithSignals {
  address: string;
  name: string;
  win_rate: number;
  signal_count: number;
  total_pnl: number;
  last_signal_date: string | null;
  recent_signals: Array<{
    id: string;
    symbol: string;
    action: 'LONG' | 'SHORT';
    created_at: string;
    pnl?: number;
    status: 'open' | 'closed';
  }>;
}

export default function FollowingPage() {
  const { follows, isLoaded } = useFollows();
  const [providersData, setProvidersData] = useState<ProviderWithSignals[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || follows.length === 0) {
      setLoading(false);
      return;
    }

    const fetchProviderData = async () => {
      try {
        // Fetch data for each followed provider
        const promises = follows.map(async (follow) => {
          const response = await fetch(`/api/providers/${follow.address}?include_recent_signals=true`);
          if (response.ok) {
            const data = await response.json();
            return {
              address: follow.address,
              name: data.name || follow.name,
              win_rate: data.win_rate || 0,
              signal_count: data.signal_count || 0,
              total_pnl: data.total_pnl || 0,
              last_signal_date: data.last_signal_date || null,
              recent_signals: data.recent_signals || [],
            };
          }
          return null;
        });

        const results = await Promise.all(promises);
        setProvidersData(results.filter(Boolean) as ProviderWithSignals[]);
      } catch (error) {
        console.error('Failed to fetch provider data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [follows, isLoaded]);

  if (!isLoaded) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="animate-pulse">
          <div className="h-8 bg-[#2a2a2a] rounded w-48 mb-4"></div>
          <div className="h-4 bg-[#1a1a1a] rounded w-96 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-[#1a1a1a] rounded-lg"></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (follows.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="text-center max-w-md mx-auto">
          <Heart className="w-16 h-16 text-[#3a3a3a] mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-4">No Followed Providers</h1>
          <p className="text-[#737373] mb-6">
            Start following successful traders to personalize your experience and track their performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/leaderboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium"
            >
              Browse Top Providers
            </Link>
            <Link 
              href="/feed"
              className="inline-flex items-center justify-center px-6 py-3 border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:border-[#3a3a3a] hover:bg-[#1a1a1a] transition-all"
            >
              View Signal Feed
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Following ({follows.length})</h1>
          <p className="text-[#737373] text-sm">
            Track performance and recent activity from your followed providers
          </p>
        </div>
        <Link 
          href="/leaderboard"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          Find More Providers <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {follows.map((follow) => (
            <div key={follow.address} className="animate-pulse">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                <div className="h-6 bg-[#2a2a2a] rounded w-48 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="h-20 bg-[#2a2a2a] rounded"></div>
                  <div className="h-20 bg-[#2a2a2a] rounded"></div>
                  <div className="h-20 bg-[#2a2a2a] rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {providersData.map((provider) => (
            <div key={provider.address} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 hover:border-[#3a3a3a] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Link 
                    href={`/provider/${provider.name}`}
                    className="text-lg font-semibold hover:text-blue-400 transition-colors"
                  >
                    {provider.name}
                  </Link>
                  <span className="text-xs text-[#737373] font-mono">
                    {provider.address.slice(0, 8)}...
                  </span>
                </div>
                <FollowButton 
                  providerAddress={provider.address}
                  providerName={provider.name}
                  variant="compact"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
                  <div className="text-lg font-bold text-green-400 mb-1">
                    {Math.round(provider.win_rate)}%
                  </div>
                  <div className="text-xs text-[#737373]">Win Rate</div>
                </div>
                <div className="text-center p-3 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
                  <div className="text-lg font-bold text-white mb-1">
                    {provider.signal_count}
                  </div>
                  <div className="text-xs text-[#737373]">Signals</div>
                </div>
                <div className="text-center p-3 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
                  <div className={`text-lg font-bold mb-1 ${provider.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(provider.total_pnl).toFixed(2)}
                  </div>
                  <div className="text-xs text-[#737373]">
                    {provider.total_pnl >= 0 ? 'Profit' : 'Loss'}
                  </div>
                </div>
                <div className="text-center p-3 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
                  <div className="text-lg font-bold text-blue-400 mb-1">
                    {provider.last_signal_date 
                      ? Math.round((Date.now() - new Date(provider.last_signal_date).getTime()) / (1000 * 60 * 60 * 24))
                      : '—'}
                  </div>
                  <div className="text-xs text-[#737373]">Days Ago</div>
                </div>
              </div>

              {provider.recent_signals.length > 0 ? (
                <div className="border-t border-[#2a2a2a] pt-4">
                  <h4 className="text-sm font-medium text-[#737373] mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Recent Signals
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {provider.recent_signals.slice(0, 3).map((signal) => (
                      <Link 
                        key={signal.id}
                        href={`/signals/${signal.id}`}
                        className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded hover:border-[#3a3a3a] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm">{signal.symbol}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            signal.action === 'LONG' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {signal.action}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#737373]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(signal.created_at).toLocaleDateString()}
                          </span>
                          {signal.status === 'closed' && signal.pnl !== undefined && (
                            <span className={signal.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                              ${signal.pnl.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#2a2a2a] pt-4 text-center text-[#737373] text-sm">
                  No recent signals from this provider
                </div>
              )}

              <div className="mt-4 flex justify-between items-center">
                <Link 
                  href={`/provider/${provider.name}`}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  View Full Profile <ArrowUpRight className="w-3 h-3" />
                </Link>
                <span className="text-xs text-[#737373]">
                  Following since {new Date(follows.find(f => f.address === provider.address)?.followedAt || '').toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}