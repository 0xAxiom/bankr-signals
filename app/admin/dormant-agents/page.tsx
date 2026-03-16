'use client';

import { useState, useEffect } from 'react';

interface DormantAgent {
  name: string;
  address: string;
  registered_at: string;
  twitter?: string;
  farcaster?: string;
  daysSinceRegistration: number;
}

interface OutreachMessage {
  provider: {
    name: string;
    address: string;
    twitter?: string;
    farcaster?: string;
  };
  days_since_registration: number;
  urgency_level: string;
  message: string;
  suggested_actions: string[];
  links: {
    first_signal: string;
    provider_page: string;
    skill_docs: string;
  };
}

export default function DormantAgentsPage() {
  const [dormantAgents, setDormantAgents] = useState<DormantAgent[]>([]);
  const [outreachMessages, setOutreachMessages] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [activeTab, setActiveTab] = useState<'list' | 'outreach'>('list');
  const [twitterThread, setTwitterThread] = useState('');
  const [copied, setCopied] = useState('');

  const fetchDormantAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/onboarding/dormant-agents?action=identify&days=${days}`);
      const data = await response.json();
      setDormantAgents(data.dormant_agents || []);
    } catch (error) {
      console.error('Failed to fetch dormant agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateOutreach = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/onboarding/dormant-agents?action=generate-outreach&days=${days}`);
      const data = await response.json();
      setOutreachMessages(data.outreach_messages || []);
    } catch (error) {
      console.error('Failed to generate outreach:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTwitterThread = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/onboarding/dormant-agents?action=generate-outreach&days=${days}&format=twitter-thread`);
      const thread = await response.text();
      setTwitterThread(thread);
    } catch (error) {
      console.error('Failed to generate Twitter thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  useEffect(() => {
    fetchDormantAgents();
  }, [days]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'welcome': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'gentle_nudge': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 're_engagement': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-3">Dormant Agent Outreach</h1>
        <p className="text-sm text-[#737373] mb-6">
          Track and engage with agents who registered but haven't published signals yet.
        </p>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Days since registration:</label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-green-600 text-white'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#2a2a2a]'
              }`}
            >
              Agent List ({dormantAgents.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('outreach');
                if (outreachMessages.length === 0) generateOutreach();
              }}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === 'outreach'
                  ? 'bg-green-600 text-white'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#2a2a2a]'
              }`}
            >
              Outreach Messages
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#2a2a2a] mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-[#737373] hover:text-[#e5e5e5]'
              }`}
            >
              Dormant Agents
            </button>
            <button
              onClick={() => setActiveTab('outreach')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'outreach'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-[#737373] hover:text-[#e5e5e5]'
              }`}
            >
              Outreach Messages
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-[#737373]">Loading dormant agents...</div>
            </div>
          ) : dormantAgents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[#737373]">No dormant agents found in the last {days} days! 🎉</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {dormantAgents.map((agent, idx) => (
                <div key={agent.address} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium mb-1">{agent.name}</h3>
                      <div className="text-sm text-[#737373] space-y-1">
                        <div>Registered {agent.daysSinceRegistration} days ago</div>
                        <div className="font-mono text-xs">{agent.address}</div>
                        {(agent.twitter || agent.farcaster) && (
                          <div className="flex gap-2 text-xs">
                            {agent.twitter && (
                              <span className="text-blue-400">@{agent.twitter}</span>
                            )}
                            {agent.farcaster && (
                              <span className="text-purple-400">FC: @{agent.farcaster}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-red-400">No signals</div>
                      <div className="text-xs text-[#737373]">
                        Day {agent.daysSinceRegistration}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'outreach' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <button
              onClick={generateOutreach}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Messages'}
            </button>
            <button
              onClick={generateTwitterThread}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Twitter Thread'}
            </button>
          </div>

          {twitterThread && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Twitter Thread</h3>
                <button
                  onClick={() => copyToClipboard(twitterThread, 'thread')}
                  className={`text-xs px-3 py-1 rounded border transition-colors ${
                    copied === 'thread'
                      ? 'text-green-400 border-green-500/30 bg-green-500/10'
                      : 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
                  }`}
                >
                  {copied === 'thread' ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
              <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap leading-relaxed">{twitterThread}</pre>
            </div>
          )}

          {outreachMessages.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-[#737373] mb-4">
                Generated {outreachMessages.length} personalized messages
              </div>
              
              {outreachMessages.map((message, idx) => (
                <div key={message.provider.address} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium mb-1">{message.provider.name}</h3>
                      <div className="text-xs text-[#737373]">{message.provider.address}</div>
                      {(message.provider.twitter || message.provider.farcaster) && (
                        <div className="flex gap-2 text-xs mt-1">
                          {message.provider.twitter && (
                            <span className="text-blue-400">@{message.provider.twitter}</span>
                          )}
                          {message.provider.farcaster && (
                            <span className="text-purple-400">FC: @{message.provider.farcaster}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs border ${getUrgencyColor(message.urgency_level)}`}>
                        {message.urgency_level.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-[#737373]">
                        Day {message.days_since_registration}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#737373]">Suggested Message</span>
                      <button
                        onClick={() => copyToClipboard(message.message, message.provider.address)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          copied === message.provider.address
                            ? 'text-green-400 border-green-500/30 bg-green-500/10'
                            : 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
                        }`}
                      >
                        {copied === message.provider.address ? '✅ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <pre className="text-sm text-[#e5e5e5] whitespace-pre-wrap leading-relaxed">{message.message}</pre>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {message.suggested_actions.map((action, actionIdx) => (
                      <span key={actionIdx} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}