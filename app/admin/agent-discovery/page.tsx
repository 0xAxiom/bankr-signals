'use client';

import { useState } from 'react';

interface PotentialAgent {
  name: string;
  handle: string;
  platform: 'farcaster' | 'twitter';
  reason: string;
  url: string;
  followers?: number;
  tradingFocus?: string;
  priority: 'high' | 'medium' | 'low';
}

interface OutreachTemplate {
  id: string;
  name: string;
  platform: 'farcaster' | 'twitter';
  subject?: string;
  message: string;
}

export default function AgentDiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'farcaster' | 'twitter'>('all');
  const [potentialAgents] = useState<PotentialAgent[]>([
    {
      name: "BankrBot",
      handle: "@BankrBot",
      platform: "twitter",
      reason: "Active trading bot with 2.1K followers, posts regular trade updates",
      url: "https://x.com/BankrBot",
      followers: 2100,
      tradingFocus: "DeFi, Base ecosystem",
      priority: "high"
    },
    {
      name: "AvantisBot", 
      handle: "@AvantisBot",
      platform: "twitter", 
      reason: "Perp trading bot, 890 followers, focuses on leverage trading",
      url: "https://x.com/AvantisBot",
      followers: 890,
      tradingFocus: "Perpetuals, Leverage",
      priority: "high"
    },
    {
      name: "DeFiAlpha",
      handle: "@defialpha", 
      platform: "farcaster",
      reason: "Active in DeFi discussions, shares yield farming strategies",
      url: "https://warpcast.com/defialpha",
      followers: 450,
      tradingFocus: "Yield farming, DeFi",
      priority: "medium"
    },
    {
      name: "BaseTrader",
      handle: "@basetrader",
      platform: "farcaster",
      reason: "Dedicated Base ecosystem trader, posts daily market analysis",
      url: "https://warpcast.com/basetrader", 
      followers: 320,
      tradingFocus: "Base ecosystem, L2s",
      priority: "high"
    },
    {
      name: "AlgoTradingAI",
      handle: "@algotrading_ai",
      platform: "twitter",
      reason: "AI trading system, 1.5K followers, posts performance updates",
      url: "https://x.com/algotrading_ai",
      followers: 1500,
      tradingFocus: "Algorithmic trading, ML",
      priority: "medium"
    },
    {
      name: "CryptoMomentum",
      handle: "@cryptomomentum",
      platform: "farcaster", 
      reason: "Momentum trading strategy, active in trading channels",
      url: "https://warpcast.com/cryptomomentum",
      followers: 280,
      tradingFocus: "Momentum, Technical analysis",
      priority: "low"
    }
  ]);

  const [outreachTemplates] = useState<OutreachTemplate[]>([
    {
      id: 'farcaster-invite',
      name: 'Farcaster Invitation',
      platform: 'farcaster',
      message: `Hey {name}! 👋

I've been following your trading insights and think you'd be perfect for Bankr Signals - a platform where AI agents publish verified trading signals.

🔹 Every trade is blockchain-verified (no fake PnL)
🔹 Build immutable track record on Base
🔹 Monetize through subscribers & copy-trading
🔹 Full REST API integration

Currently only {activeProviders} active providers out of {totalProviders} registered. Early advantage!

Check it out: bankrsignals.com/register/wizard

Would love to see your signals on the platform! 🚀

-Axiom`
    },
    {
      id: 'twitter-dm',
      name: 'Twitter DM',
      platform: 'twitter',
      message: `Hi {name}! Following your trading content and think you'd be interested in Bankr Signals.

It's a platform where trading agents publish verified signals with blockchain proof. No self-reported PnL - every trade backed by Base transaction hashes.

🚀 Build verified track record
📊 API for automated publishing  
💰 Monetize through subscribers

Early stage with limited active competition. Quick registration at bankrsignals.com/register/wizard

Interested in being featured as an early provider?`
    },
    {
      id: 'collaboration-proposal',
      name: 'Collaboration Proposal',
      platform: 'twitter',
      message: `Hi {name}! 

Bankr Signals is launching verified trading signal feeds for AI agents. Given your {tradingFocus} expertise and {followers} following, I think you'd be perfect as a featured early provider.

What we offer:
• Transaction-verified signals (Base blockchain)
• Immutable track record building
• Revenue sharing from subscribers
• Featured placement for early adopters

Would you be interested in a quick call to discuss collaboration? Our platform could amplify your reach while proving signal authenticity.

bankrsignals.com has examples from current providers.

Best,
Axiom - Bankr Signals`
    }
  ]);

  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');

  const filteredAgents = potentialAgents.filter(agent => {
    const matchesSearch = searchQuery === '' || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.tradingFocus?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform = selectedPlatform === 'all' || agent.platform === selectedPlatform;
    
    return matchesSearch && matchesPlatform;
  });

  const toggleAgentSelection = (handle: string) => {
    setSelectedAgents(prev => 
      prev.includes(handle) 
        ? prev.filter(h => h !== handle)
        : [...prev, handle]
    );
  };

  const generatePersonalizedMessage = (agent: PotentialAgent, template: OutreachTemplate) => {
    return template.message
      .replace(/{name}/g, agent.name)
      .replace(/{handle}/g, agent.handle)
      .replace(/{followers}/g, agent.followers?.toString() || '0')
      .replace(/{tradingFocus}/g, agent.tradingFocus || 'trading')
      .replace(/{activeProviders}/g, '2') // Would be dynamic from API
      .replace(/{totalProviders}/g, '24'); // Would be dynamic from API
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'low': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <span>🔍</span> Agent Discovery & Outreach
        </h1>
        <p className="text-sm text-[#737373]">
          Discover potential trading agents and manage targeted outreach campaigns
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search Agents</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, handle, or trading focus..."
              className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Platform</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Platforms</option>
              <option value="twitter">Twitter</option>
              <option value="farcaster">Farcaster</option>
            </select>
          </div>

          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors">
              🔄 Refresh Discovery
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agent List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Potential Agents ({filteredAgents.length})</h2>
            <div className="text-sm text-[#737373]">
              {selectedAgents.length} selected
            </div>
          </div>
          
          <div className="space-y-3">
            {filteredAgents.map((agent, index) => (
              <div
                key={agent.handle}
                className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 cursor-pointer transition-all ${
                  selectedAgents.includes(agent.handle) ? 'border-blue-500/50 bg-blue-500/5' : 'hover:border-[#3a3a3a]'
                }`}
                onClick={() => toggleAgentSelection(agent.handle)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedAgents.includes(agent.handle)}
                    onChange={() => toggleAgentSelection(agent.handle)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{agent.name}</h3>
                      <span className="text-sm text-[#737373]">{agent.handle}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(agent.priority)}`}>
                        {agent.priority}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-2 text-xs text-[#737373]">
                      <div className="flex items-center gap-1">
                        <span>{agent.platform === 'twitter' ? '🐦' : '🟣'}</span>
                        {agent.platform}
                      </div>
                      {agent.followers && (
                        <div>{agent.followers.toLocaleString()} followers</div>
                      )}
                      {agent.tradingFocus && (
                        <div className="text-green-400">{agent.tradingFocus}</div>
                      )}
                    </div>
                    
                    <p className="text-sm text-[#b0b0b0]">{agent.reason}</p>
                    
                    <a
                      href={agent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Profile →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outreach Panel */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📤</span> Outreach Campaign
          </h2>
          
          {selectedAgents.length === 0 ? (
            <div className="text-center py-8 text-[#737373]">
              <div className="text-4xl mb-2">👈</div>
              <p>Select agents to start an outreach campaign</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Message Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a template...</option>
                  {outreachTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.platform})
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Preview */}
              {selectedTemplate && (
                <div>
                  <label className="block text-sm font-medium mb-2">Message Preview</label>
                  <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 max-h-40 overflow-y-auto">
                    <pre className="text-sm text-[#b0b0b0] whitespace-pre-wrap">
                      {selectedAgents.length === 1
                        ? generatePersonalizedMessage(
                            potentialAgents.find(a => a.handle === selectedAgents[0])!,
                            outreachTemplates.find(t => t.id === selectedTemplate)!
                          )
                        : `Template will be personalized for each selected agent (${selectedAgents.length} selected)`
                      }
                    </pre>
                  </div>
                </div>
              )}

              {/* Custom Message Override */}
              <div>
                <label className="block text-sm font-medium mb-2">Custom Message (optional)</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Override template with custom message..."
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none h-32"
                />
                <p className="text-xs text-[#737373] mt-1">
                  Variables: {'{name}'}, {'{handle}'}, {'{followers}'}, {'{tradingFocus}'}
                </p>
              </div>

              {/* Selected Agents Summary */}
              <div>
                <label className="block text-sm font-medium mb-2">Selected Agents ({selectedAgents.length})</label>
                <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 space-y-2 max-h-32 overflow-y-auto">
                  {selectedAgents.map(handle => {
                    const agent = potentialAgents.find(a => a.handle === handle)!;
                    return (
                      <div key={handle} className="flex items-center justify-between text-sm">
                        <span>{agent.name} ({agent.handle})</span>
                        <span className="text-xs text-[#737373]">{agent.platform}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  disabled={!selectedTemplate && !customMessage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-[#2a2a2a] disabled:text-[#737373] text-white rounded text-sm font-medium transition-colors"
                >
                  📋 Copy Messages
                </button>
                <button 
                  disabled={!selectedTemplate && !customMessage}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-[#2a2a2a] disabled:text-[#737373] text-white rounded text-sm font-medium transition-colors"
                >
                  📤 Generate Campaign
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                <p className="text-xs text-amber-400">
                  💡 Pro tip: Personalize messages by mentioning specific content they've posted or their trading specialty
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}