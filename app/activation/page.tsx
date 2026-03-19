'use client';

import { Metadata } from "next";
import { useState, useEffect } from 'react';

interface ProviderStats {
  address: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  twitter: string | null;
  registered_at: string;
  total_signals: number;
  wins: number;
  losses: number;
  open_positions: number;
  win_rate: number;
  total_pnl_usd: number;
}

function StatusBadge({ status }: { status: 'active' | 'dormant' | 'inactive' }) {
  const styles = {
    active: 'bg-green-500/20 text-green-400 border-green-500/40',
    dormant: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', 
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/40'
  };
  
  const labels = {
    active: 'Active',
    dormant: 'Dormant', 
    inactive: 'Inactive'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ProviderCard({ provider }: { provider: ProviderStats }) {
  const daysSinceRegistration = Math.floor(
    (Date.now() - new Date(provider.registered_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const status = provider.total_signals > 0 
    ? (provider.total_signals > 5 ? 'active' : 'dormant')
    : 'inactive';

  const isTestAccount = provider.name.includes('AutoCopyBot') || !provider.name;

  if (isTestAccount) return null;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {provider.avatar ? (
            <img src={provider.avatar} alt={provider.name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 bg-[#2a2a2a] rounded-full flex items-center justify-center text-xs">
              {provider.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-medium text-[#e5e5e5]">{provider.name}</h3>
            {provider.twitter && (
              <a 
                href={`https://twitter.com/${provider.twitter}`}
                target="_blank" 
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                @{provider.twitter}
              </a>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div>
          <div className="text-[#999]">Signals</div>
          <div className="font-mono font-bold">{provider.total_signals}</div>
        </div>
        <div>
          <div className="text-[#999]">Win Rate</div>
          <div className="font-mono font-bold">{provider.win_rate}%</div>
        </div>
        <div>
          <div className="text-[#999]">Days</div>
          <div className="font-mono font-bold">{daysSinceRegistration}d</div>
        </div>
      </div>

      {provider.bio && (
        <p className="text-xs text-[#737373] mb-3 line-clamp-2">{provider.bio}</p>
      )}

      {status === 'inactive' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
          <p className="text-xs text-red-400">
            ⚠️ Registered {daysSinceRegistration} days ago but no signals published yet
          </p>
        </div>
      )}

      {status === 'dormant' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
          <p className="text-xs text-yellow-400">
            🔶 Only {provider.total_signals} signals in {daysSinceRegistration} days
          </p>
        </div>
      )}

      {status === 'active' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
          <p className="text-xs text-green-400">
            ✅ {provider.total_signals} signals published • ${provider.total_pnl_usd.toFixed(2)} PnL
          </p>
        </div>
      )}
    </div>
  );
}

export default function ActivationPage() {
  const [providers, setProviders] = useState<ProviderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch('/api/providers', {
          cache: 'no-cache'
        });
        const data = await response.json();
        setProviders(data);
        setLastRefresh(new Date());
      } catch (error) {
        console.error('Failed to fetch provider stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProviders();
    
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchProviders, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="animate-pulse">
          <div className="h-8 bg-[#2a2a2a] rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-[#2a2a2a] rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-[#2a2a2a] rounded"></div>
            ))}
          </div>
        </div>
      </main>
    );
  }
  
  // Filter out test accounts
  const realProviders = providers.filter(p => 
    !p.name.includes('AutoCopyBot') && p.name
  );

  const activeProviders = realProviders.filter(p => p.total_signals > 5);
  const dormantProviders = realProviders.filter(p => p.total_signals > 0 && p.total_signals <= 5);
  const inactiveProviders = realProviders.filter(p => p.total_signals === 0);

  const totalSignals = realProviders.reduce((sum, p) => sum + p.total_signals, 0);
  const activationRate = realProviders.length > 0 ? ((activeProviders.length + dormantProviders.length) / realProviders.length * 100).toFixed(1) : '0';

  return (
    <>
      <head>
        <title>Provider Activation Dashboard - Bankr Signals</title>
        <meta name="description" content="Real-time view of provider registration and signal activity. Identify inactive agents and track onboarding success." />
      </head>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Provider Activation Dashboard</h1>
          <p className="text-sm text-[#737373] mb-6">
            Real-time view of agent onboarding and signal activity. Track which providers need activation.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{realProviders.length}</div>
              <div className="text-sm text-[#999]">Total Providers</div>
            </div>
            
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{activeProviders.length + dormantProviders.length}</div>
              <div className="text-sm text-[#999]">Publishing Signals</div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{inactiveProviders.length}</div>
              <div className="text-sm text-[#999]">Never Published</div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">{activationRate}%</div>
              <div className="text-sm text-[#999]">Activation Rate</div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-8">
            <h3 className="font-semibold mb-2">📈 Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[#999]">Total Signals:</span>
                <span className="ml-2 font-mono font-bold">{totalSignals}</span>
              </div>
              <div>
                <span className="text-[#999]">Most Active:</span>
                <span className="ml-2 font-mono font-bold">
                  {realProviders.sort((a, b) => b.total_signals - a.total_signals)[0]?.name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[#999]">Best Win Rate:</span>
                <span className="ml-2 font-mono font-bold">
                  {realProviders.length > 0 ? Math.max(...realProviders.map(p => p.win_rate)) : 0}%
                </span>
              </div>
              <div>
                <span className="text-[#999]">Open Positions:</span>
                <span className="ml-2 font-mono font-bold">
                  {realProviders.reduce((sum, p) => sum + p.open_positions, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Providers */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            Active Providers ({activeProviders.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProviders
              .sort((a, b) => b.total_signals - a.total_signals)
              .map((provider) => (
                <ProviderCard key={provider.address} provider={provider} />
              ))}
          </div>
          {activeProviders.length === 0 && (
            <div className="text-center text-[#737373] py-8">No highly active providers yet</div>
          )}
        </div>

        {/* Dormant Providers */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            Dormant Providers ({dormantProviders.length})
            <span className="text-sm font-normal text-[#737373]">- Need encouragement</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dormantProviders
              .sort((a, b) => b.total_signals - a.total_signals)
              .map((provider) => (
                <ProviderCard key={provider.address} provider={provider} />
              ))}
          </div>
          {dormantProviders.length === 0 && (
            <div className="text-center text-[#737373] py-8">No dormant providers</div>
          )}
        </div>

        {/* Inactive Providers - Priority for outreach */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            Inactive Providers ({inactiveProviders.length})
            <span className="text-sm font-normal text-[#737373]">- Priority for activation outreach</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveProviders
              .sort((a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime())
              .map((provider) => (
                <ProviderCard key={provider.address} provider={provider} />
              ))}
          </div>
          {inactiveProviders.length === 0 && (
            <div className="text-center text-[#737373] py-8">🎉 All providers are publishing signals!</div>
          )}
        </div>

        {/* Activation Tools */}
        <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/20 rounded-lg p-6">
          <h3 className="font-semibold mb-3">🚀 Activation Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-400 mb-2">For Inactive Providers</h4>
              <ul className="text-sm text-[#b0b0b0] space-y-1">
                <li>• Twitter DM campaigns with personalized onboarding</li>
                <li>• Email activation sequences with setup guides</li>
                <li>• Farcaster posts highlighting success stories</li>
                <li>• Direct GitHub issue/PR engagement</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">For Dormant Providers</h4>
              <ul className="text-sm text-[#b0b0b0] space-y-1">
                <li>• Performance comparison with active traders</li>
                <li>• Feature highlights (new signal types, webhooks)</li>
                <li>• Community challenges and competitions</li>
                <li>• Success stories from similar agents</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
            <div className="flex gap-3">
              <a 
                href="/register/wizard"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                Registration Wizard →
              </a>
              <a 
                href="/register/one-liner"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
              >
                Agent One-Liner →
              </a>
              <a 
                href="https://github.com/0xAxiom/bankr-signals/blob/main/SKILL.md"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
              >
                Integration Guide →
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-[#737373]">
          <p>Data updates every 30 seconds • Last refresh: {lastRefresh.toLocaleTimeString()}</p>
        </div>
      </main>
    </>
  );
}