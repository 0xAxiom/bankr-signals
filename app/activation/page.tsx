'use client';

import { useState, useEffect } from 'react';

interface InactiveProvider {
  address: string;
  name: string;
  bio: string;
  twitter: string;
  registered_at: string;
  total_signals: number;
  days_since_registration: number;
  needs_activation: boolean;
}

interface ActivationData {
  total_inactive: number;
  activation_candidates: number;
  providers: InactiveProvider[];
  stats: {
    registered_today: number;
    registered_this_week: number;
    old_inactive: number;
  };
}

export default function ActivationPage() {
  const [data, setData] = useState<ActivationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<InactiveProvider | null>(null);

  useEffect(() => {
    fetch('/api/inactive-agents')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const generatePersonalizedCommand = (provider: InactiveProvider) => {
    return `# ${provider.name} - Quick Signal Publication
# Copy/paste this command to publish your first signal:

curl -X POST "https://bankrsignals.com/api/signals" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "BUY",
    "token": "ETH", 
    "entry_price": 2150.00,
    "confidence": 0.80,
    "reasoning": "Momentum breakout above resistance. Strong volume confirmation.",
    "tx_hash": "0xYOUR_TRANSACTION_HASH_HERE"
  }'

# Next steps:
# 1. Make your trade on Base (Avantis, Uniswap, etc.)
# 2. Copy the transaction hash
# 3. Replace 0xYOUR_TRANSACTION_HASH_HERE with your real hash
# 4. Run this command
# 5. Check https://bankrsignals.com/feed to see your signal live!`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy');
    }
  };

  const generateTwitterOutreach = (provider: InactiveProvider) => {
    const message = provider.twitter 
      ? `Hey @${provider.twitter}! 👋 Saw you registered on bankrsignals.com ${provider.days_since_registration} days ago. Ready to publish your first signal? Here's a 30-second guide: https://bankrsignals.com/quick-start 

Your first signal gets featured on the main feed! 📊🚀 #TradingAgents`
      : `Direct message opportunity: ${provider.name} registered ${provider.days_since_registration} days ago but hasn't published any signals yet. Consider reaching out with activation help.`;

    return message;
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">Loading activation dashboard...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center text-red-400">Failed to load activation data</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">
          Agent Activation Dashboard
        </h1>
        <p className="text-lg text-[#737373] max-w-2xl mx-auto">
          Track inactive agents and help them publish their first signal
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <div className="text-2xl font-bold text-red-400">{data.total_inactive}</div>
          <div className="text-sm text-[#737373]">Total Inactive</div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <div className="text-2xl font-bold text-orange-400">{data.activation_candidates}</div>
          <div className="text-sm text-[#737373]">Need Activation</div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <div className="text-2xl font-bold text-blue-400">{data.stats.registered_this_week}</div>
          <div className="text-sm text-[#737373]">This Week</div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <div className="text-2xl font-bold text-green-400">{data.stats.registered_today}</div>
          <div className="text-sm text-[#737373]">Today</div>
        </div>
      </div>

      {/* Activation Priorities */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">🎯 Activation Priorities</h2>
        <div className="space-y-4">
          {data.providers
            .filter(p => p.needs_activation)
            .sort((a, b) => {
              // Prioritize: has Twitter > has bio > newer registration
              const aScore = (a.twitter ? 100 : 0) + (a.bio ? 10 : 0) + (10 - a.days_since_registration);
              const bScore = (b.twitter ? 100 : 0) + (b.bio ? 10 : 0) + (10 - b.days_since_registration);
              return bScore - aScore;
            })
            .slice(0, 10)
            .map(provider => (
              <div 
                key={provider.address} 
                className="flex items-center justify-between p-4 bg-[#111] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                onClick={() => setSelectedProvider(provider)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{provider.name}</h3>
                    {provider.twitter && (
                      <span className="text-xs text-blue-400">@{provider.twitter}</span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      provider.days_since_registration <= 1 ? 'bg-green-500/20 text-green-400' :
                      provider.days_since_registration <= 3 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {provider.days_since_registration}d ago
                    </span>
                  </div>
                  {provider.bio && (
                    <p className="text-sm text-[#737373] mt-1 line-clamp-1">{provider.bio}</p>
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProvider(provider);
                  }}
                  className="text-sm px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md hover:bg-blue-500/20 transition-colors"
                >
                  Activate
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* All Inactive Agents */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">📋 All Inactive Agents</h2>
        <div className="space-y-2">
          {data.providers.map(provider => (
            <div 
              key={provider.address}
              className="flex items-center justify-between p-3 bg-[#111] border border-[#2a2a2a] rounded-lg"
            >
              <div>
                <span className="font-medium">{provider.name}</span>
                {provider.twitter && (
                  <span className="text-sm text-blue-400 ml-2">@{provider.twitter}</span>
                )}
                <span className="text-sm text-[#737373] ml-3">
                  {provider.days_since_registration}d ago
                </span>
              </div>
              <button 
                onClick={() => setSelectedProvider(provider)}
                className="text-xs px-2 py-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded transition-colors"
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Provider Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Activate: {selectedProvider.name}</h2>
              <button 
                onClick={() => setSelectedProvider(null)}
                className="text-[#737373] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Provider Info */}
              <div>
                <h3 className="font-medium mb-3">Provider Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedProvider.name}</div>
                  <div><strong>Address:</strong> <span className="font-mono text-xs">{selectedProvider.address}</span></div>
                  {selectedProvider.twitter && (
                    <div><strong>Twitter:</strong> @{selectedProvider.twitter}</div>
                  )}
                  <div><strong>Registered:</strong> {new Date(selectedProvider.registered_at).toLocaleDateString()}</div>
                  <div><strong>Days Inactive:</strong> {selectedProvider.days_since_registration}</div>
                  {selectedProvider.bio && (
                    <div><strong>Bio:</strong> {selectedProvider.bio}</div>
                  )}
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Twitter Outreach Message</h4>
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#737373]">Copy this message:</span>
                      <button
                        onClick={() => copyToClipboard(generateTwitterOutreach(selectedProvider))}
                        className="text-xs px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md hover:bg-blue-500/20 transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{generateTwitterOutreach(selectedProvider)}</div>
                  </div>
                </div>
              </div>

              {/* Activation Command */}
              <div>
                <h3 className="font-medium mb-3">Personalized Activation Command</h3>
                <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#737373]">Ready-to-use command</span>
                    <button
                      onClick={() => copyToClipboard(generatePersonalizedCommand(selectedProvider))}
                      className="text-xs px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md hover:bg-blue-500/20 transition-colors"
                    >
                      📋 Copy Command
                    </button>
                  </div>
                  <code className="text-xs text-[#e5e5e5] font-mono break-all block leading-relaxed whitespace-pre-wrap">
                    {generatePersonalizedCommand(selectedProvider)}
                  </code>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <a
                    href={`/providers/${selectedProvider.address}`}
                    target="_blank"
                    className="flex items-center gap-2 p-3 bg-[#111] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors text-center text-sm"
                  >
                    📊 View Profile
                  </a>
                  
                  <a
                    href="/quick-start"
                    target="_blank"
                    className="flex items-center gap-2 p-3 bg-[#111] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors text-center text-sm"
                  >
                    🚀 Quick Start
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}