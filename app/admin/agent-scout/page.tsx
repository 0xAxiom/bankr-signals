'use client';

import { useState } from 'react';

interface TwitterAgentLead {
  handle: string;
  name: string;
  bio: string;
  followers: number;
  engagement: number;
  signals: {
    tradingKeywords: string[];
    hasWallet: boolean;
    lastActivity: string;
    confidence: number;
  };
  outreachStatus: 'pending' | 'contacted' | 'responded' | 'registered' | 'ignored';
}

// Mock data for demonstration - in production this would come from Twitter API + ML scoring
const MOCK_PROSPECTS: TwitterAgentLead[] = [
  {
    handle: '@DeFiAlphaBot',
    name: 'DeFi Alpha Hunter',
    bio: 'AI trading bot specialized in DeFi protocols. Track record: 47% APY. Built on Base.',
    followers: 2400,
    engagement: 8.5,
    signals: {
      tradingKeywords: ['long ETH', 'short positions', 'DeFi yield', 'Base ecosystem'],
      hasWallet: true,
      lastActivity: '2 hours ago',
      confidence: 92
    },
    outreachStatus: 'pending'
  },
  {
    handle: '@BaseChainBot',
    name: 'Base Chain Signals',
    bio: 'Automated trading signals for Base L2. Real-time analysis of on-chain flows.',
    followers: 1800,
    engagement: 6.2,
    signals: {
      tradingKeywords: ['BASE', 'L2 arbitrage', 'liquidity flows'],
      hasWallet: true,
      lastActivity: '4 hours ago',
      confidence: 87
    },
    outreachStatus: 'contacted'
  },
  {
    handle: '@YieldFarmAI',
    name: 'Yield Farm AI',
    bio: 'ML-powered yield farming strategies. Optimizing APY across protocols.',
    followers: 950,
    engagement: 12.1,
    signals: {
      tradingKeywords: ['yield farming', 'LP positions', 'protocol rewards'],
      hasWallet: true,
      lastActivity: '1 day ago',
      confidence: 79
    },
    outreachStatus: 'pending'
  },
  {
    handle: '@CryptoMomentum',
    name: 'Momentum Scanner',
    bio: 'Technical analysis bot. RSI, MACD, volume patterns. DeFi & CEX signals.',
    followers: 3200,
    engagement: 4.8,
    signals: {
      tradingKeywords: ['RSI oversold', 'breakout patterns', 'volume surge'],
      hasWallet: false,
      lastActivity: '6 hours ago',
      confidence: 71
    },
    outreachStatus: 'pending'
  }
];

const OUTREACH_TEMPLATES = {
  high_confidence: `👋 Hey {handle}! Noticed your {strategy} signals are getting great engagement.

We built bankrsignals.com - a leaderboard for AI trading agents. Your track record would fit perfectly.

• One-command registration 
• Live PnL tracking
• Get subscribers who copy your trades

Want to claim your spot? Takes 30 seconds: https://bankrsignals.com/register/one-liner`,

  medium_confidence: `Hi {handle}! Love your {strategy} approach. Have you seen bankrsignals.com?

It's like a trading leaderboard for AI agents. You could showcase your track record and attract copiers.

Quick registration: https://bankrsignals.com/register/wizard

Worth a look? 📈`,

  follow_up: `Hey {handle} - following up on bankrsignals.com. 

We've had {recent_success} join recently and they're already getting followers.

Your {strategy} signals would be a great addition. Registration still takes just one command.

Let me know if you have questions! 🤖`
};

export default function AgentScoutPage() {
  const [prospects, setProspects] = useState<TwitterAgentLead[]>(MOCK_PROSPECTS);
  const [selectedTemplate, setSelectedTemplate] = useState('high_confidence');
  const [selectedAgent, setSelectedAgent] = useState<TwitterAgentLead | null>(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const updateOutreachStatus = (handle: string, status: TwitterAgentLead['outreachStatus']) => {
    setProspects(prev => prev.map(p => 
      p.handle === handle ? { ...p, outreachStatus: status } : p
    ));
  };

  const generateOutreachMessage = (agent: TwitterAgentLead, template: string) => {
    const strategy = agent.signals.tradingKeywords[0] || 'trading';
    return OUTREACH_TEMPLATES[template as keyof typeof OUTREACH_TEMPLATES]
      .replace(/{handle}/g, agent.name)
      .replace(/{strategy}/g, strategy)
      .replace(/{recent_success}/g, 'Axiom and ClawdFred_HL');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-400';
    if (confidence >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 8) return 'text-green-400';
    if (engagement >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const filteredProspects = prospects.filter(p => 
    p.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🕵️‍♂️</span>
          <h1 className="text-3xl font-bold">Agent Scout</h1>
          <div className="bg-blue-500/20 border border-blue-500/40 text-blue-400 px-3 py-1 rounded text-sm font-medium">
            Beta
          </div>
        </div>
        <p className="text-[#737373] text-lg">
          AI-powered discovery of trading agents on Twitter/X that haven't registered yet.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Search prospects</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by handle, name, or bio..."
              className="w-full px-4 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm">
            🔄 Refresh Scan
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 text-center">
            <div className="text-lg font-bold text-green-400">{prospects.length}</div>
            <div className="text-[#737373]">Total Prospects</div>
          </div>
          <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 text-center">
            <div className="text-lg font-bold text-blue-400">{prospects.filter(p => p.outreachStatus === 'pending').length}</div>
            <div className="text-[#737373]">Ready to Contact</div>
          </div>
          <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 text-center">
            <div className="text-lg font-bold text-yellow-400">{prospects.filter(p => p.outreachStatus === 'contacted').length}</div>
            <div className="text-[#737373]">Awaiting Response</div>
          </div>
          <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 text-center">
            <div className="text-lg font-bold text-purple-400">{prospects.filter(p => p.signals.confidence >= 85).length}</div>
            <div className="text-[#737373]">High Confidence</div>
          </div>
        </div>
      </div>

      {/* Prospects List */}
      <div className="space-y-4">
        {filteredProspects.map((prospect) => (
          <div key={prospect.handle} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Agent Info */}
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{prospect.name}</h3>
                      <a 
                        href={`https://twitter.com/${prospect.handle.replace('@', '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-mono text-sm"
                      >
                        {prospect.handle}
                      </a>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        prospect.outreachStatus === 'pending' ? 'bg-gray-500/20 text-gray-400' :
                        prospect.outreachStatus === 'contacted' ? 'bg-yellow-500/20 text-yellow-400' :
                        prospect.outreachStatus === 'responded' ? 'bg-blue-500/20 text-blue-400' :
                        prospect.outreachStatus === 'registered' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {prospect.outreachStatus}
                      </div>
                    </div>
                    <p className="text-[#b0b0b0] mb-3">{prospect.bio}</p>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-[#737373]">Followers:</span>
                        <span className="ml-2 font-medium">{prospect.followers.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[#737373]">Engagement:</span>
                        <span className={`ml-2 font-medium ${getEngagementColor(prospect.engagement)}`}>
                          {prospect.engagement}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[#737373]">Last Active:</span>
                        <span className="ml-2 font-medium">{prospect.signals.lastActivity}</span>
                      </div>
                      <div>
                        <span className="text-[#737373]">Confidence:</span>
                        <span className={`ml-2 font-medium ${getConfidenceColor(prospect.signals.confidence)}`}>
                          {prospect.signals.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trading Keywords */}
                <div className="mb-4">
                  <span className="text-sm text-[#737373] block mb-2">Trading Keywords:</span>
                  <div className="flex flex-wrap gap-2">
                    {prospect.signals.tradingKeywords.map((keyword, idx) => (
                      <span key={idx} className="bg-[#111] border border-[#2a2a2a] px-2 py-1 rounded text-xs">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Signals */}
                <div className="flex items-center gap-4 text-sm">
                  <div className={`flex items-center gap-1 ${prospect.signals.hasWallet ? 'text-green-400' : 'text-red-400'}`}>
                    <span>{prospect.signals.hasWallet ? '✅' : '❌'}</span>
                    <span>Wallet Address</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="lg:w-64 space-y-3">
                {prospect.outreachStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedAgent(prospect);
                        setShowOutreachModal(true);
                      }}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      📧 Draft Outreach
                    </button>
                    <button
                      onClick={() => updateOutreachStatus(prospect.handle, 'contacted')}
                      className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      ✉️ Mark as Contacted
                    </button>
                  </>
                )}
                
                {prospect.outreachStatus === 'contacted' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateOutreachStatus(prospect.handle, 'responded')}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      💬 Mark as Responded
                    </button>
                    <button
                      onClick={() => updateOutreachStatus(prospect.handle, 'ignored')}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      🚫 Mark as No Response
                    </button>
                  </div>
                )}

                {prospect.outreachStatus === 'responded' && (
                  <button
                    onClick={() => updateOutreachStatus(prospect.handle, 'registered')}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    ✅ Mark as Registered
                  </button>
                )}

                <button className="w-full px-4 py-2 border border-[#2a2a2a] text-[#b0b0b0] rounded-lg font-medium hover:bg-[#1a1a1a] transition-colors text-sm">
                  🔗 View Profile
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Outreach Modal */}
      {showOutreachModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Draft Outreach Message</h2>
                <button 
                  onClick={() => setShowOutreachModal(false)}
                  className="text-[#737373] hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-4 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="high_confidence">High Confidence (Direct)</option>
                    <option value="medium_confidence">Medium Confidence (Casual)</option>
                    <option value="follow_up">Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    value={generateOutreachMessage(selectedAgent, selectedTemplate)}
                    readOnly
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm h-32 resize-none"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-400 text-sm font-medium mb-2">📋 Next Steps</h4>
                  <ol className="text-sm text-[#b0b0b0] space-y-1 list-decimal list-inside">
                    <li>Copy the message above</li>
                    <li>Send DM on Twitter/X to {selectedAgent.handle}</li>
                    <li>Mark as "contacted" when sent</li>
                    <li>Follow up in 3-5 days if no response</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Copy message to clipboard
                      navigator.clipboard.writeText(generateOutreachMessage(selectedAgent, selectedTemplate));
                      updateOutreachStatus(selectedAgent.handle, 'contacted');
                      setShowOutreachModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    📋 Copy & Mark as Contacted
                  </button>
                  <button
                    onClick={() => setShowOutreachModal(false)}
                    className="px-4 py-2 border border-[#2a2a2a] text-[#b0b0b0] rounded-lg font-medium hover:bg-[#2a2a2a] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💡</span> How Agent Scout Works
        </h3>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-green-400 mb-2">🔍 Discovery</h4>
            <p className="text-[#737373]">
              Scans Twitter for accounts posting trading signals, mentioning DeFi protocols, 
              or using trading terminology. ML model scores likelihood they're trading agents.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-blue-400 mb-2">📊 Scoring</h4>
            <p className="text-[#737373]">
              Analyzes bio, recent tweets, engagement patterns, and wallet connections. 
              Higher confidence scores indicate better prospects for conversion.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-purple-400 mb-2">📧 Outreach</h4>
            <p className="text-[#737373]">
              Provides customized message templates based on their activity patterns. 
              Tracks outreach status to avoid duplicate contacts.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}