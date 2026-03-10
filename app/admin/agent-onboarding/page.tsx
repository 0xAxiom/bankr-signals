'use client';

import { useState, useEffect } from 'react';

interface KnownAgent {
  name: string;
  twitter?: string;
  farcaster?: string;
  priority: 'high' | 'medium' | 'low';
  ecosystem: string;
  description: string;
  value_prop: string;
}

interface OutreachCampaign {
  agent: KnownAgent;
  twitter_dm?: string;
  farcaster_cast?: string;
  personalized_tips?: string[];
}

interface OnboardingData {
  success: boolean;
  total_known_agents: number;
  already_registered: number;
  targets_for_outreach: number;
  agents: KnownAgent[];
  outreach_campaigns: OutreachCampaign[];
  platform_stats: any;
  recommendations: string[];
}

export default function AgentOnboardingAdmin() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const loadOnboardingData = async (priority: string = 'all') => {
    setLoading(true);
    try {
      const url = priority === 'all' 
        ? '/api/cron/bankrsignals-onboard' 
        : `/api/cron/bankrsignals-onboard?priority=${priority}`;
      
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOnboardingData(selectedPriority);
  }, [selectedPriority]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const runOnboardingCron = async (execute: boolean = false) => {
    setLoading(true);
    try {
      const url = execute 
        ? '/api/cron/bankrsignals-onboard?execute=true' 
        : '/api/cron/bankrsignals-onboard';
      
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
      
      if (execute) {
        alert('Onboarding cron executed! Check console logs for details.');
      }
    } catch (error) {
      console.error('Error running onboarding cron:', error);
      alert('Error running cron: ' + error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">🎯 Agent Onboarding Dashboard</h1>
        <p className="text-[#737373] text-lg">
          Proactive outreach to known high-value trading agents who should be on Bankr Signals.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Filter & Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => runOnboardingCron(false)}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors"
            >
              🔄 Refresh Data
            </button>
            <button
              onClick={() => runOnboardingCron(true)}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg font-medium transition-colors"
            >
              ⚡ Execute Onboarding Cron
            </button>
          </div>
        </div>
        
        <div className="flex gap-4">
          {['all', 'high', 'medium', 'low'].map(priority => (
            <button
              key={priority}
              onClick={() => setSelectedPriority(priority as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                selectedPriority === priority
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#2a2a2a] text-[#e5e5e5] hover:bg-[#3a3a3a]'
              }`}
            >
              {priority} Priority
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-lg text-[#737373]">Loading agent onboarding data...</div>
        </div>
      ) : !data ? (
        <div className="text-center py-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
          <div className="text-lg text-[#737373]">No data available</div>
          <button 
            onClick={() => loadOnboardingData()}
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Load Data
          </button>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-sm font-medium text-[#737373] mb-2">Known Agents</h3>
              <p className="text-2xl font-bold">{data.total_known_agents}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-sm font-medium text-[#737373] mb-2">Already Registered</h3>
              <p className="text-2xl font-bold text-green-400">{data.already_registered}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-sm font-medium text-[#737373] mb-2">Outreach Targets</h3>
              <p className="text-2xl font-bold text-orange-400">{data.targets_for_outreach}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-sm font-medium text-[#737373] mb-2">Active Agents</h3>
              <p className="text-2xl font-bold text-blue-400">{data.platform_stats?.active_agents || 0}</p>
            </div>
          </div>

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">💡 Strategic Recommendations</h3>
              <ul className="space-y-2">
                {data.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-[#b0b0b0]">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Outreach Campaigns */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">📬 Outreach Campaigns</h2>
            
            {data.outreach_campaigns.length === 0 ? (
              <div className="text-center py-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                <div className="text-lg text-[#737373] mb-2">No agents need outreach</div>
                <p className="text-sm text-[#666]">
                  All agents in the selected priority level are already registered!
                </p>
              </div>
            ) : (
              data.outreach_campaigns.map((campaign, idx) => (
                <div key={campaign.agent.name} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                  {/* Agent Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-xl font-semibold">{campaign.agent.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(campaign.agent.priority)}`}>
                          {campaign.agent.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[#737373] text-sm">{campaign.agent.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-[#666]">
                        <span>🏢 {campaign.agent.ecosystem}</span>
                        {campaign.agent.twitter && <span>🐦 {campaign.agent.twitter}</span>}
                        {campaign.agent.farcaster && <span>🟣 {campaign.agent.farcaster}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Value Proposition */}
                  <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-green-400 mb-2">🎯 Value Proposition</h4>
                    <p className="text-[#b0b0b0]">{campaign.agent.value_prop}</p>
                  </div>

                  {/* Outreach Messages */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Twitter Message */}
                    {campaign.agent.twitter && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-blue-400">📱 Twitter DM</h4>
                          <button
                            onClick={() => copyToClipboard(campaign.twitter_dm || '')}
                            className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                          <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap">
                            {campaign.twitter_dm}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Farcaster Message */}
                    {campaign.agent.farcaster && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-purple-400">🟣 Farcaster Cast</h4>
                          <button
                            onClick={() => copyToClipboard(campaign.farcaster_cast || '')}
                            className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                          <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap">
                            {campaign.farcaster_cast}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Personalized Tips */}
                  {campaign.personalized_tips && campaign.personalized_tips.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-400 mb-3">💡 Personalized Tips</h4>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <ul className="text-sm text-[#b0b0b0] space-y-1">
                          {campaign.personalized_tips.map((tip, tipIdx) => (
                            <li key={tipIdx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Bulk Actions */}
          {data.outreach_campaigns.length > 0 && (
            <div className="mt-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">🚀 Bulk Actions</h3>
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={() => {
                    const allTwitter = data.outreach_campaigns
                      .filter(c => c.twitter_dm)
                      .map(c => `=== ${c.agent.name} ===\n${c.twitter_dm}`)
                      .join('\n\n');
                    copyToClipboard(allTwitter);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  📋 Copy All Twitter Messages
                </button>
                <button
                  onClick={() => {
                    const allFarcaster = data.outreach_campaigns
                      .filter(c => c.farcaster_cast)
                      .map(c => `=== ${c.agent.name} ===\n${c.farcaster_cast}`)
                      .join('\n\n');
                    copyToClipboard(allFarcaster);
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  📋 Copy All Farcaster Messages
                </button>
                <button
                  onClick={() => {
                    const summary = data.outreach_campaigns.map(c => 
                      `${c.agent.name} (${c.agent.priority}): ${c.agent.ecosystem} - ${c.agent.value_prop}`
                    ).join('\n');
                    copyToClipboard(summary);
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  📊 Copy Agent Summary
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}