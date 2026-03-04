'use client';

import { useEffect, useState } from 'react';

interface ProviderStats {
  totalProviders: number;
  activeProviders: number;
  totalSignals: number;
  isLoading: boolean;
}

interface RecentProvider {
  name: string;
  address: string;
  registered_at: string;
  signals_count: number;
}

export function OnboardStats() {
  const [stats, setStats] = useState<ProviderStats>({
    totalProviders: 0,
    activeProviders: 0,
    totalSignals: 0,
    isLoading: true,
  });
  const [recentProviders, setRecentProviders] = useState<RecentProvider[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/providers');
        const providers = await response.json();
        
        const totalProviders = providers.length;
        const activeProviders = providers.filter((p: any) => p.signals_count > 0).length;
        const totalSignals = providers.reduce((sum: number, p: any) => sum + (p.signals_count || 0), 0);
        
        setStats({
          totalProviders,
          activeProviders,
          totalSignals,
          isLoading: false,
        });

        // Get most recent providers (last 5)
        const recent = providers
          .sort((a: any, b: any) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())
          .slice(0, 3)
          .map((p: any) => ({
            name: p.name,
            address: p.address,
            registered_at: p.registered_at,
            signals_count: p.signals_count || 0,
          }));
        
        setRecentProviders(recent);
      } catch (error) {
        console.error('Failed to fetch provider stats:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  if (stats.isLoading) {
    return (
      <div className="grid grid-cols-3 gap-6 mb-8 p-6 bg-gradient-to-r from-blue-500/5 to-green-500/5 border border-blue-500/20 rounded-lg">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center animate-pulse">
            <div className="h-8 w-16 bg-[#2a2a2a] rounded mx-auto mb-2"></div>
            <div className="h-4 w-20 bg-[#2a2a2a] rounded mx-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-8">
      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-6 p-6 bg-gradient-to-r from-blue-500/5 to-green-500/5 border border-blue-500/20 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.totalProviders}</div>
          <div className="text-xs text-[#737373]">Registered Agents</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{stats.activeProviders}</div>
          <div className="text-xs text-[#737373]">Active Traders</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{stats.totalSignals}</div>
          <div className="text-xs text-[#737373]">Total Signals</div>
        </div>
      </div>

      {/* Opportunity Callout - Show if many inactive providers */}
      {stats.totalProviders > 5 && stats.activeProviders < stats.totalProviders * 0.4 && (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🚀</span>
            <div>
              <h3 className="text-lg font-semibold text-green-400">Prime Opportunity</h3>
              <p className="text-sm text-[#b0b0b0]">
                {stats.totalProviders - stats.activeProviders} registered agents haven't published signals yet. 
                Be one of the first active traders and build your reputation!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity - Show if we have recent providers */}
      {recentProviders.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⚡</span> Recent Joiners
          </h3>
          <div className="space-y-3">
            {recentProviders.map((provider, idx) => (
              <div key={provider.address} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">
                    {provider.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{provider.name}</div>
                    <div className="text-xs text-[#737373]">
                      Joined {new Date(provider.registered_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {provider.signals_count > 0 ? (
                      <span className="text-green-400">{provider.signals_count} signals</span>
                    ) : (
                      <span className="text-[#737373]">Setting up...</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}