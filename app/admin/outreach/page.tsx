'use client';

import { useState, useEffect } from 'react';

interface Provider {
  address: string;
  name: string;
  bio?: string;
  twitter?: string;
  farcaster?: string;
  website?: string;
  registered_at: string;
  total_signals: number;
  days_inactive?: number;
  hours_since_registration?: number;
}

interface OutreachCampaign {
  provider: Provider;
  twitter_dm?: string;
  twitter_message?: string;
  farcaster_cast?: string;
  farcaster_message?: string;
  quick_start_tips?: string[];
  personalized_tips?: string[];
}

export default function OutreachAdmin() {
  const [loading, setLoading] = useState(false);
  const [inactiveProviders, setInactiveProviders] = useState<Provider[]>([]);
  const [newProviders, setNewProviders] = useState<Provider[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<'inactive' | 'followup'>('inactive');
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [stats, setStats] = useState<any>(null);

  const loadInactiveProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inactive-providers?generateTemplates=true&minDaysInactive=3');
      const data = await response.json();
      setInactiveProviders(data.providers || []);
      setCampaigns(data.templates || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading inactive providers:', error);
    }
    setLoading(false);
  };

  const loadNewProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cron/follow-up-outreach?hoursThreshold=48');
      const data = await response.json();
      setNewProviders(data.providers || []);
      setCampaigns(data.outreach_campaigns || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading new providers:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCampaign === 'inactive') {
      loadInactiveProviders();
    } else {
      loadNewProviders();
    }
  }, [selectedCampaign]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Agent Outreach Dashboard</h1>
        <p className="text-[#737373] text-lg">
          Manage outreach campaigns to activate registered but inactive trading agents.
        </p>
      </div>

      {/* Campaign Type Selector */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Select Campaign Type</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedCampaign('inactive')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedCampaign === 'inactive'
                ? 'bg-blue-600 text-white'
                : 'bg-[#2a2a2a] text-[#e5e5e5] hover:bg-[#3a3a3a]'
            }`}
          >
            📊 Long-term Inactive Providers
          </button>
          <button
            onClick={() => setSelectedCampaign('followup')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedCampaign === 'followup'
                ? 'bg-green-600 text-white'
                : 'bg-[#2a2a2a] text-[#e5e5e5] hover:bg-[#3a3a3a]'
            }`}
          >
            🚀 Recent Registration Follow-ups
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-sm font-medium text-[#737373] mb-2">Total Targets</h3>
            <p className="text-2xl font-bold">
              {selectedCampaign === 'inactive' ? stats.total_inactive : stats.ready_for_outreach || 0}
            </p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-sm font-medium text-[#737373] mb-2">Never Published</h3>
            <p className="text-2xl font-bold text-orange-400">
              {selectedCampaign === 'inactive' ? stats.never_published : stats.very_recent || 0}
            </p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-sm font-medium text-[#737373] mb-2">Previously Active</h3>
            <p className="text-2xl font-bold text-yellow-400">
              {selectedCampaign === 'inactive' ? stats.stopped_publishing : '—'}
            </p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-sm font-medium text-[#737373] mb-2">Avg Days Inactive</h3>
            <p className="text-2xl font-bold text-red-400">
              {selectedCampaign === 'inactive' ? stats.avg_days_inactive : Math.round((stats.avg_hours_since_registration || 0) / 24)}
            </p>
          </div>
        </div>
      )}

      {/* Campaign Templates */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-[#737373]">Loading outreach campaigns...</div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
            <div className="text-lg text-[#737373] mb-2">No campaigns available</div>
            <p className="text-sm text-[#666]">
              {selectedCampaign === 'inactive' 
                ? 'All providers are active or recently engaged'
                : 'No recent registrations need follow-up'
              }
            </p>
          </div>
        ) : (
          campaigns.map((campaign, idx) => (
            <div key={campaign.provider.address} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              {/* Provider Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">{campaign.provider.name}</h3>
                  <p className="text-[#737373] text-sm font-mono">{campaign.provider.address.slice(0, 20)}...</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[#737373]">
                    <span>Registered: {formatDate(campaign.provider.registered_at)}</span>
                    <span>•</span>
                    <span>Signals: {campaign.provider.total_signals}</span>
                    {campaign.provider.days_inactive && (
                      <>
                        <span>•</span>
                        <span className="text-orange-400">
                          {campaign.provider.days_inactive} days inactive
                        </span>
                      </>
                    )}
                    {campaign.provider.hours_since_registration && (
                      <>
                        <span>•</span>
                        <span className="text-blue-400">
                          {Math.floor(campaign.provider.hours_since_registration / 24)}d since registration
                        </span>
                      </>
                    )}
                  </div>
                  {campaign.provider.bio && (
                    <p className="text-sm text-[#b0b0b0] mt-2 italic">"{campaign.provider.bio}"</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {campaign.provider.twitter && (
                    <a
                      href={`https://twitter.com/${campaign.provider.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Twitter
                    </a>
                  )}
                  {campaign.provider.farcaster && (
                    <a
                      href={`https://warpcast.com/${campaign.provider.farcaster.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      Farcaster
                    </a>
                  )}
                </div>
              </div>

              {/* Outreach Messages */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Twitter Message */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-blue-400">📱 Twitter DM</h4>
                    <button
                      onClick={() => copyToClipboard(campaign.twitter_dm || campaign.twitter_message || '')}
                      className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                    <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap">
                      {campaign.twitter_dm || campaign.twitter_message}
                    </pre>
                  </div>
                </div>

                {/* Farcaster Message */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-purple-400">🟣 Farcaster Cast</h4>
                    <button
                      onClick={() => copyToClipboard(campaign.farcaster_cast || campaign.farcaster_message || '')}
                      className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                    <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap">
                      {campaign.farcaster_cast || campaign.farcaster_message}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Tips */}
              {(campaign.quick_start_tips || campaign.personalized_tips) && (
                <div className="mt-6">
                  <h4 className="font-medium text-green-400 mb-3">💡 Personalized Tips</h4>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <ul className="text-sm text-[#b0b0b0] space-y-1">
                      {(campaign.quick_start_tips || campaign.personalized_tips)?.map((tip, tipIdx) => (
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
      {campaigns.length > 0 && (
        <div className="mt-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🚀 Bulk Actions</h3>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => {
                const allTwitter = campaigns
                  .map(c => c.twitter_dm || c.twitter_message)
                  .filter(Boolean)
                  .join('\n\n---\n\n');
                copyToClipboard(allTwitter);
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              📋 Copy All Twitter Messages
            </button>
            <button
              onClick={() => {
                const allFarcaster = campaigns
                  .map(c => c.farcaster_cast || c.farcaster_message)
                  .filter(Boolean)
                  .join('\n\n---\n\n');
                copyToClipboard(allFarcaster);
              }}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              📋 Copy All Farcaster Messages
            </button>
            <button
              onClick={() => {
                const summary = campaigns.map(c => 
                  `${c.provider.name} (${c.provider.address.slice(0, 10)}...): ${c.provider.total_signals} signals, ${
                    selectedCampaign === 'inactive' 
                      ? `${c.provider.days_inactive}d inactive`
                      : `${Math.floor((c.provider.hours_since_registration || 0) / 24)}d since registration`
                  }`
                ).join('\n');
                copyToClipboard(summary);
              }}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              📊 Copy Provider Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}