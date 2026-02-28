"use client";

import { useState, useMemo } from "react";
import { getProviderStats } from "@/lib/signals";

interface Provider {
  address: string;
  name: string;
  bio: string;
  signalCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade?: any;
  worstTrade?: any;
  avatar?: string;
}

interface CompareProvidersProps {
  providers: Provider[];
}

interface ProviderStats {
  provider: Provider;
  totalSignals: number;
  openSignals: number;
  closedSignals: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: any;
  worstTrade: any;
  recentActivity: string;
  avgConfidence: number;
}

export function CompareProviders({ providers }: CompareProvidersProps) {
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [loading, setLoading] = useState(false);

  const handleProviderToggle = async (address: string) => {
    const newSelected = selectedProviders.includes(address)
      ? selectedProviders.filter(p => p !== address)
      : [...selectedProviders, address].slice(0, 3); // Max 3 providers

    setSelectedProviders(newSelected);

    if (newSelected.length >= 2) {
      setLoading(true);
      try {
        // Fetch detailed stats for selected providers
        const stats = await Promise.all(
          newSelected.map(async (addr) => {
            const provider = providers.find(p => p.address === addr);
            if (!provider) return null;

            // Calculate detailed stats
            const response = await fetch(`/api/provider-stats?address=${addr}`);
            const data = await response.json();

            return {
              provider,
              totalSignals: data.totalSignals || 0,
              openSignals: data.openSignals || 0,
              closedSignals: data.closedSignals || 0,
              winRate: data.winRate || 0,
              totalPnl: data.totalPnl || 0,
              avgPnl: data.avgPnl || 0,
              bestTrade: data.bestTrade,
              worstTrade: data.worstTrade,
              recentActivity: data.recentActivity || 'No recent activity',
              avgConfidence: data.avgConfidence || 0
            };
          })
        );
        
        setProviderStats(stats.filter(Boolean) as ProviderStats[]);
      } catch (error) {
        console.error('Error fetching provider stats:', error);
      }
      setLoading(false);
    } else {
      setProviderStats([]);
    }
  };

  const maxSignals = Math.max(...providerStats.map(p => p.totalSignals), 1);

  return (
    <div>
      {/* Provider Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold mb-4">Select Providers to Compare (2-3)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {providers.map(provider => (
            <button
              key={provider.address}
              onClick={() => handleProviderToggle(provider.address)}
              disabled={!selectedProviders.includes(provider.address) && selectedProviders.length >= 3}
              className={`text-left p-4 rounded-lg border transition-all ${
                selectedProviders.includes(provider.address)
                  ? 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)]'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
              } ${
                !selectedProviders.includes(provider.address) && selectedProviders.length >= 3
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {provider.avatar ? (
                  <img 
                    src={provider.avatar} 
                    alt={provider.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-[#2a2a2a] rounded-full flex items-center justify-center">
                    <span className="text-xs font-mono">{provider.name[0]}</span>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-sm">{provider.name}</div>
                  <div className="text-xs text-[#737373]">{provider.signalCount} signals</div>
                </div>
              </div>
              <p className="text-xs text-[#b0b0b0] line-clamp-2">{provider.bio}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Results */}
      {selectedProviders.length >= 2 && (
        <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="bg-[#1a1a1a] p-4 border-b border-[#2a2a2a]">
            <h3 className="font-semibold">Comparison Results</h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-sm text-[#737373]">Loading comparison data...</div>
            </div>
          ) : providerStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#111]">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-[#e5e5e5]">Metric</th>
                    {providerStats.map(stat => (
                      <th key={stat.provider.address} className="text-center p-3 text-xs font-semibold text-[#e5e5e5]">
                        {stat.provider.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#2a2a2a]">
                    <td className="p-3 text-xs text-[#737373]">Total Signals</td>
                    {providerStats.map(stat => (
                      <td key={`${stat.provider.address}-signals`} className="p-3 text-center">
                        <div className="relative">
                          <div className="text-sm font-mono font-semibold">{stat.totalSignals}</div>
                          <div className="mt-1 w-full bg-[#2a2a2a] rounded-full h-1">
                            <div 
                              className="h-full bg-[rgba(34,197,94,0.6)] rounded-full"
                              style={{ width: `${(stat.totalSignals / maxSignals) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[#2a2a2a]">
                    <td className="p-3 text-xs text-[#737373]">Win Rate</td>
                    {providerStats.map(stat => (
                      <td key={`${stat.provider.address}-winrate`} className="p-3 text-center">
                        <span className={`text-sm font-mono font-semibold ${
                          stat.winRate >= 60 ? 'text-[rgba(34,197,94,0.8)]' :
                          stat.winRate >= 40 ? 'text-[rgba(234,179,8,0.8)]' :
                          'text-[rgba(239,68,68,0.8)]'
                        }`}>
                          {stat.winRate.toFixed(1)}%
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[#2a2a2a]">
                    <td className="p-3 text-xs text-[#737373]">Average PnL</td>
                    {providerStats.map(stat => (
                      <td key={`${stat.provider.address}-avgpnl`} className="p-3 text-center">
                        <span className={`text-sm font-mono font-semibold ${
                          stat.avgPnl > 0 ? 'text-[rgba(34,197,94,0.8)]' : 'text-[rgba(239,68,68,0.8)]'
                        }`}>
                          {stat.avgPnl > 0 ? '+' : ''}{stat.avgPnl.toFixed(2)}%
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[#2a2a2a]">
                    <td className="p-3 text-xs text-[#737373]">Total PnL</td>
                    {providerStats.map(stat => (
                      <td key={`${stat.provider.address}-totalpnl`} className="p-3 text-center">
                        <span className={`text-sm font-mono font-semibold ${
                          stat.totalPnl > 0 ? 'text-[rgba(34,197,94,0.8)]' : 'text-[rgba(239,68,68,0.8)]'
                        }`}>
                          {stat.totalPnl > 0 ? '+' : ''}{stat.totalPnl.toFixed(2)}%
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[#2a2a2a]">
                    <td className="p-3 text-xs text-[#737373]">Open Positions</td>
                    {providerStats.map(stat => (
                      <td key={`${stat.provider.address}-open`} className="p-3 text-center">
                        <span className="text-sm font-mono">{stat.openSignals}</span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[#2a2a2a]">
                    <td className="p-3 text-xs text-[#737373]">Avg Confidence</td>
                    {providerStats.map(stat => (
                      <td key={`${stat.provider.address}-confidence`} className="p-3 text-center">
                        <span className="text-sm font-mono">
                          {stat.avgConfidence ? `${(stat.avgConfidence * 100).toFixed(0)}%` : 'N/A'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[#2a2a2a]">
                    <td className="p-3 text-xs text-[#737373]">Best Trade</td>
                    {providerStats.map(stat => (
                      <td key={`${stat.provider.address}-best`} className="p-3 text-center">
                        {stat.bestTrade ? (
                          <div>
                            <div className="text-xs font-mono text-[rgba(34,197,94,0.8)]">
                              +{stat.bestTrade.pnl.toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-[#737373]">
                              {stat.bestTrade.action} {stat.bestTrade.token}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#555]">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[#2a2a2a]">
                    <td className="p-3 text-xs text-[#737373]">Worst Trade</td>
                    {providerStats.map(stat => (
                      <td key={`${stat.provider.address}-worst`} className="p-3 text-center">
                        {stat.worstTrade ? (
                          <div>
                            <div className="text-xs font-mono text-[rgba(239,68,68,0.8)]">
                              {stat.worstTrade.pnl.toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-[#737373]">
                              {stat.worstTrade.action} {stat.worstTrade.token}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#555]">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {selectedProviders.length === 1 && (
        <div className="text-center py-8 text-sm text-[#737373]">
          Select at least one more provider to compare
        </div>
      )}
    </div>
  );
}