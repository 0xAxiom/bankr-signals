'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Provider {
  address: string;
  name: string;
  bio?: string;
  twitter?: string;
  farcaster?: string;
  daysSinceRegistration: number;
  registrationDate: string;
  registered_at: string;
}

interface MonitorData {
  stats: {
    totalInactive: number;
    needingFollowUp: number;
    longTermInactive: number;
    withTwitter: number;
    withFarcaster: number;
  };
  categorized: {
    recent: Provider[];
    followUp1: Provider[];
    followUp2: Provider[];
    longTermInactive: Provider[];
  };
  recommendations: Array<{
    priority: string;
    action: string;
    targets: number;
    description: string;
  }>;
  generatedAt: string;
}

export default function InactiveProvidersMonitor() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitor/inactive-providers');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">📊 Provider Activation Monitor</h1>
          <div className="text-[#737373]">Loading monitoring data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-red-400">⚠️ Monitor Error</h1>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <p className="text-red-400">Failed to load monitoring data: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Provider Activation Monitor</h1>
            <p className="text-[#737373]">
              Track inactive providers and automated follow-up recommendations
            </p>
            <p className="text-xs text-[#555] mt-1">
              Last updated: {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{data.stats.totalInactive}</div>
            <div className="text-xs text-[#737373]">Inactive Providers</div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{data.stats.needingFollowUp}</div>
            <div className="text-xs text-[#737373]">Need Follow-up</div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{data.stats.longTermInactive}</div>
            <div className="text-xs text-[#737373]">Long-term Inactive</div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{data.stats.withTwitter}</div>
            <div className="text-xs text-[#737373]">With Twitter</div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{data.stats.withFarcaster}</div>
            <div className="text-xs text-[#737373]">With Farcaster</div>
          </div>
        </div>

        {/* Action Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>⚡</span> Action Recommendations
            </h2>
            <div className="space-y-3">
              {data.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{rec.action}</div>
                    <div className="text-sm opacity-75">{rec.targets} providers</div>
                  </div>
                  <div className="text-sm opacity-90">{rec.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provider Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Priority: 1-3 days */}
          {data.categorized.followUp1.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
                <span>🔥</span> High Priority (1-3 days)
              </h3>
              <div className="space-y-3">
                {data.categorized.followUp1.map((provider) => (
                  <div key={provider.address} className="bg-[#1a1a1a] border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        <p className="text-xs text-[#737373]">{provider.address.slice(0, 12)}...</p>
                      </div>
                      <span className="text-xs text-red-400">{provider.daysSinceRegistration} days</span>
                    </div>
                    {provider.bio && (
                      <p className="text-sm text-[#999] mb-2 line-clamp-2">{provider.bio}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      {provider.twitter && (
                        <a 
                          href={`https://twitter.com/${provider.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          @{provider.twitter}
                        </a>
                      )}
                      {provider.farcaster && (
                        <span className="text-purple-400">FC: @{provider.farcaster}</span>
                      )}
                      <span className="text-[#737373] ml-auto">Reg: {provider.registrationDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority: 3-7 days */}
          {data.categorized.followUp2.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-yellow-400 flex items-center gap-2">
                <span>⚠️</span> Medium Priority (3-7 days)
              </h3>
              <div className="space-y-3">
                {data.categorized.followUp2.map((provider) => (
                  <div key={provider.address} className="bg-[#1a1a1a] border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        <p className="text-xs text-[#737373]">{provider.address.slice(0, 12)}...</p>
                      </div>
                      <span className="text-xs text-yellow-400">{provider.daysSinceRegistration} days</span>
                    </div>
                    {provider.bio && (
                      <p className="text-sm text-[#999] mb-2 line-clamp-2">{provider.bio}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      {provider.twitter && (
                        <a 
                          href={`https://twitter.com/${provider.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          @{provider.twitter}
                        </a>
                      )}
                      {provider.farcaster && (
                        <span className="text-purple-400">FC: @{provider.farcaster}</span>
                      )}
                      <span className="text-[#737373] ml-auto">Reg: {provider.registrationDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent: 0-24 hours */}
          {data.categorized.recent.length > 0 && (
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4 text-green-400 flex items-center gap-2">
                <span>🆕</span> Recent Registrations (0-24 hours)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.categorized.recent.map((provider) => (
                  <div key={provider.address} className="bg-[#1a1a1a] border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        <p className="text-xs text-[#737373]">{provider.address.slice(0, 12)}...</p>
                      </div>
                      <span className="text-xs text-green-400">New!</span>
                    </div>
                    {provider.bio && (
                      <p className="text-sm text-[#999] mb-2 line-clamp-2">{provider.bio}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      {provider.twitter && (
                        <a 
                          href={`https://twitter.com/${provider.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          @{provider.twitter}
                        </a>
                      )}
                      {provider.farcaster && (
                        <span className="text-purple-400">FC: @{provider.farcaster}</span>
                      )}
                      <span className="text-[#737373] ml-auto">Today</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Long-term Inactive (collapsed by default) */}
          {data.categorized.longTermInactive.length > 0 && (
            <div className="lg:col-span-2">
              <details className="group">
                <summary className="cursor-pointer text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 hover:text-blue-300">
                  <span>📦</span> Long-term Inactive (7+ days) - {data.categorized.longTermInactive.length} providers
                  <span className="text-xs group-open:rotate-90 transition-transform">▶</span>
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  {data.categorized.longTermInactive.map((provider) => (
                    <div key={provider.address} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{provider.name}</h4>
                          <p className="text-xs text-[#737373]">{provider.address.slice(0, 10)}...</p>
                        </div>
                        <span className="text-xs text-[#555]">{provider.daysSinceRegistration}d</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {provider.twitter && <span className="text-blue-400">📱</span>}
                        {provider.farcaster && <span className="text-purple-400">🟣</span>}
                        <span className="text-[#737373] ml-auto">{provider.registrationDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex items-center justify-between pt-6 border-t border-[#2a2a2a]">
          <div className="text-sm text-[#737373]">
            Monitor runs automatically. Follow-up actions can be automated via cron jobs.
          </div>
          <div className="flex gap-3">
            <Link 
              href="/admin/outreach"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            >
              📤 View Outreach Tools
            </Link>
            <Link 
              href="/feed"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              📊 View Signal Feed
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}