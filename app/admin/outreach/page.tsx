'use client';

import { useState, useEffect } from 'react';

interface InactiveProvider {
  address: string;
  name: string;
  bio?: string;
  twitter?: string;
  farcaster?: string;
  website?: string;
  registered_at: string;
  last_signal_at?: string;
  total_signals: number;
  days_inactive: number;
}

interface OutreachTemplate {
  provider: InactiveProvider;
  twitter_message: string;
  farcaster_message: string;
  email_subject: string;
  email_body: string;
  personalized_tips: string[];
}

interface OutreachStats {
  total_inactive: number;
  never_published: number;
  stopped_publishing: number;
  avg_days_inactive: number;
}

export default function OutreachPage() {
  const [providers, setProviders] = useState<InactiveProvider[]>([]);
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    minDaysInactive: 7,
    maxProviders: 50
  });

  const fetchInactiveProviders = async (generateTemplates = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        minDaysInactive: filters.minDaysInactive.toString(),
        maxProviders: filters.maxProviders.toString(),
        generateTemplates: generateTemplates.toString()
      });

      const response = await fetch(`/api/inactive-providers?${params}`);
      const data = await response.json();

      if (data.providers) {
        setProviders(data.providers);
        setStats(data.stats);
        
        if (generateTemplates && data.templates) {
          setTemplates(data.templates);
        }
      }
    } catch (error) {
      console.error('Error fetching inactive providers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInactiveProviders();
  }, []);

  const generateTemplatesForSelected = async () => {
    if (selectedProviders.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/inactive-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_outreach',
          provider_addresses: selectedProviders,
          template_type: 'standard'
        })
      });

      const data = await response.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error generating templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  const selectAll = () => {
    setSelectedProviders(providers.map(p => p.address));
  };

  const selectNone = () => {
    setSelectedProviders([]);
  };

  const selectNeverPublished = () => {
    setSelectedProviders(providers.filter(p => p.total_signals === 0).map(p => p.address));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Provider Outreach Dashboard</h1>
        <p className="text-[#737373] mb-6">
          Identify and re-engage inactive providers to boost platform activity.
        </p>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{stats.total_inactive}</div>
              <div className="text-sm text-[#737373]">Total Inactive</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-400">{stats.never_published}</div>
              <div className="text-sm text-[#737373]">Never Published</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{stats.stopped_publishing}</div>
              <div className="text-sm text-[#737373]">Stopped Publishing</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-2xl font-bold text-[#e5e5e5]">{stats.avg_days_inactive}d</div>
              <div className="text-sm text-[#737373]">Avg Days Inactive</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">Min Days Inactive</label>
              <input
                type="number"
                value={filters.minDaysInactive}
                onChange={(e) => setFilters({ ...filters, minDaysInactive: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Results</label>
              <input
                type="number"
                value={filters.maxProviders}
                onChange={(e) => setFilters({ ...filters, maxProviders: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchInactiveProviders()}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={() => fetchInactiveProviders(true)}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load + Templates'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {providers.length > 0 && (
        <>
          {/* Selection Controls */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bulk Actions</h3>
              <div className="text-sm text-[#737373]">
                {selectedProviders.length} of {providers.length} selected
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={selectAll} className="px-3 py-1 bg-[#2a2a2a] hover:bg-[#333] text-sm rounded transition-colors">
                Select All
              </button>
              <button onClick={selectNone} className="px-3 py-1 bg-[#2a2a2a] hover:bg-[#333] text-sm rounded transition-colors">
                Select None
              </button>
              <button onClick={selectNeverPublished} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded transition-colors">
                Never Published Only
              </button>
            </div>
            {selectedProviders.length > 0 && (
              <button
                onClick={generateTemplatesForSelected}
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : `Generate Outreach Templates (${selectedProviders.length})`}
              </button>
            )}
          </div>

          {/* Providers Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden mb-6">
            <div className="p-4 border-b border-[#2a2a2a]">
              <h3 className="text-lg font-semibold">Inactive Providers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#111]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selectedProviders.length === providers.length}
                        onChange={() => selectedProviders.length === providers.length ? selectNone() : selectAll()}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Provider</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Signals</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Registered</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Last Signal</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Social</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider, idx) => (
                    <tr key={provider.address} className={idx % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#111]'}>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedProviders.includes(provider.address)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProviders([...selectedProviders, provider.address]);
                            } else {
                              setSelectedProviders(selectedProviders.filter(a => a !== provider.address));
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-xs text-[#737373] font-mono">{provider.address.slice(0, 12)}...</div>
                        {provider.bio && <div className="text-xs text-[#737373] mt-1">{provider.bio.slice(0, 50)}...</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          provider.total_signals === 0 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {provider.total_signals === 0 ? 'Never Published' : 'Stopped Publishing'}
                        </span>
                        <div className="text-xs text-[#737373] mt-1">{provider.days_inactive}d inactive</div>
                      </td>
                      <td className="py-3 px-4 text-sm">{provider.total_signals}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(provider.registered_at)}</td>
                      <td className="py-3 px-4 text-sm">
                        {provider.last_signal_at ? formatDate(provider.last_signal_at) : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {provider.twitter && (
                            <a href={`https://twitter.com/${provider.twitter}`} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-400 hover:text-blue-300 text-xs">
                              @{provider.twitter}
                            </a>
                          )}
                          {provider.farcaster && (
                            <a href={`https://warpcast.com/${provider.farcaster}`} target="_blank" rel="noopener noreferrer" 
                               className="text-purple-400 hover:text-purple-300 text-xs">
                              @{provider.farcaster}
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Templates Section */}
      {templates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Generated Outreach Templates</h3>
          {templates.map((template, idx) => (
            <div key={template.provider.address} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
              <div 
                className="p-4 cursor-pointer hover:bg-[#222] transition-colors"
                onClick={() => setExpandedTemplate(
                  expandedTemplate === template.provider.address ? null : template.provider.address
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{template.provider.name}</div>
                    <div className="text-sm text-[#737373]">
                      {template.provider.total_signals === 0 ? 'Never published' : `${template.provider.days_inactive}d inactive`}
                    </div>
                  </div>
                  <div className="text-[#737373]">
                    {expandedTemplate === template.provider.address ? '−' : '+'}
                  </div>
                </div>
              </div>
              
              {expandedTemplate === template.provider.address && (
                <div className="border-t border-[#2a2a2a] p-4 space-y-6">
                  {/* Twitter Message */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-400">Twitter Message</h4>
                      <button
                        onClick={() => copyToClipboard(template.twitter_message)}
                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 text-sm">
                      {template.twitter_message}
                    </div>
                  </div>

                  {/* Farcaster Message */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-purple-400">Farcaster Message</h4>
                      <button
                        onClick={() => copyToClipboard(template.farcaster_message)}
                        className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 text-sm">
                      {template.farcaster_message}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-400">Email</h4>
                      <button
                        onClick={() => copyToClipboard(`Subject: ${template.email_subject}\n\n${template.email_body}`)}
                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                      >
                        Copy Email
                      </button>
                    </div>
                    <div className="bg-[#111] border border-[#2a2a2a] rounded p-3 space-y-2">
                      <div className="text-sm font-medium">Subject: {template.email_subject}</div>
                      <div className="text-sm whitespace-pre-wrap text-[#b0b0b0]">{template.email_body}</div>
                    </div>
                  </div>

                  {/* Personalized Tips */}
                  <div>
                    <h4 className="font-medium text-amber-400 mb-2">Personalized Tips</h4>
                    <div className="bg-[#111] border border-[#2a2a2a] rounded p-3">
                      <ul className="text-sm space-y-1 text-[#b0b0b0]">
                        {template.personalized_tips.map((tip, tipIdx) => (
                          <li key={tipIdx}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-2 border-t border-[#2a2a2a]">
                    {template.provider.twitter && (
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(template.twitter_message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
                        Tweet Now
                      </a>
                    )}
                    {template.provider.farcaster && (
                      <a
                        href={`https://warpcast.com/~/compose?text=${encodeURIComponent(template.farcaster_message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                      >
                        Cast Now
                      </a>
                    )}
                    <a
                      href={`/provider/${template.provider.address}`}
                      target="_blank"
                      className="px-3 py-1 bg-[#2a2a2a] hover:bg-[#333] text-white text-xs rounded transition-colors"
                    >
                      View Profile
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {providers.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-medium mb-2">No Inactive Providers Found!</h3>
          <p className="text-[#737373]">All your providers are actively publishing signals.</p>
        </div>
      )}
    </main>
  );
}