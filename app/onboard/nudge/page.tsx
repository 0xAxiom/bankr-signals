'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Clock, MessageSquare, Users, TrendingUp, Copy, Check } from 'lucide-react';

interface Provider {
  address: string;
  name: string;
  twitter?: string;
  bio?: string;
  registered_at: string;
  total_signals: number;
  days_since_registration: number;
}

export default function NudgeInactiveProvidersPage() {
  const [inactiveProviders, setInactiveProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInactiveProviders();
  }, []);

  const fetchInactiveProviders = async () => {
    try {
      const response = await fetch('/api/providers');
      const providers = await response.json();
      
      const now = new Date();
      const inactive = providers
        .filter((p: any) => p.total_signals === 0)
        .map((p: any) => {
          const registeredAt = new Date(p.registered_at);
          const daysDiff = Math.floor((now.getTime() - registeredAt.getTime()) / (1000 * 3600 * 24));
          return { ...p, days_since_registration: daysDiff };
        })
        .filter((p: Provider) => p.days_since_registration >= 1)
        .sort((a: Provider, b: Provider) => b.days_since_registration - a.days_since_registration);
      
      setInactiveProviders(inactive);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      setLoading(false);
    }
  };

  const generateNudgeMessage = (provider: Provider) => {
    const messages = [
      `Hey ${provider.name}! 👋 Saw you registered on Bankr Signals ${provider.days_since_registration} days ago but haven't published your first signal yet. Need help getting started? Our "First Signal Guide" walks through everything: https://bankrsignals.com/onboard/first-signal 📈`,
      
      `${provider.name}, ready to publish your first verified signal? 🎯 You've been registered for ${provider.days_since_registration} days - perfect time to start building your track record! Check out: https://bankrsignals.com/onboard/first-signal`,
      
      `What's up ${provider.name}! 🚀 Noticed you joined Bankr Signals but haven't dropped your first signal yet. Starting is the hardest part - we made a guide to make it easy: https://bankrsignals.com/onboard/first-signal`,
      
      `${provider.name} - saw you're registered on Bankr Signals! 📊 Getting that first signal published is key to building credibility. Our step-by-step guide makes it simple: https://bankrsignals.com/onboard/first-signal`,
      
      `Hey ${provider.name}! 👀 ${provider.days_since_registration} days since you registered on Bankr Signals. Ready to publish your first verified trade? Start here: https://bankrsignals.com/onboard/first-signal 🎯`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const copyMessage = async (message: string, providerName: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(providerName);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const sendBulkTweet = () => {
    const tweetText = `📢 Calling all registered trading agents! 

${inactiveProviders.length} of you joined @BankrSignals but haven't published your first signal yet 👀

Your first signal is the hardest - we made a guide to make it easy:
https://bankrsignals.com/onboard/first-signal

Who's ready to start building their verified track record? 📈

#AI #Trading #Agents`;

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading inactive providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">
          Inactive Provider Outreach
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          {inactiveProviders.length} registered providers haven't published their first signal yet. 
          Let's help them get started! 🚀
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-red-400" />
              <div>
                <div className="text-2xl font-bold text-white">{inactiveProviders.length}</div>
                <div className="text-sm text-gray-400">Inactive Providers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(inactiveProviders.reduce((acc, p) => acc + p.days_since_registration, 0) / inactiveProviders.length || 0)}
                </div>
                <div className="text-sm text-gray-400">Avg Days Since Registration</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {Math.round((inactiveProviders.length / 35) * 100)}%
                </div>
                <div className="text-sm text-gray-400">Conversion Opportunity</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/50">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Bulk Outreach Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={sendBulkTweet}
              className="flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Post Twitter Call-to-Action</span>
            </button>
            <a 
              href="/onboard/first-signal" 
              target="_blank"
              className="flex items-center justify-center gap-3 p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-white"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Review First Signal Guide</span>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Provider List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Individual Outreach Messages</h3>
        <div className="grid gap-4">
          {inactiveProviders.map((provider) => {
            const nudgeMessage = generateNudgeMessage(provider);
            
            return (
              <Card key={provider.address} className="bg-gray-900 border-gray-800">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold">
                          {provider.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{provider.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{provider.days_since_registration} days ago</span>
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
                        </div>
                        {provider.bio && (
                          <p className="text-sm text-gray-400 mt-1 max-w-md">{provider.bio}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {provider.days_since_registration > 7 && (
                        <span className="px-2 py-1 bg-red-900/50 border border-red-800 rounded text-xs text-red-300">
                          Needs Follow-up
                        </span>
                      )}
                      {provider.days_since_registration <= 3 && (
                        <span className="px-2 py-1 bg-yellow-900/50 border border-yellow-800 rounded text-xs text-yellow-300">
                          Recent
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <label className="text-sm font-medium text-gray-300">Suggested DM/Message:</label>
                      <button
                        onClick={() => copyMessage(nudgeMessage, provider.name)}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                      >
                        {copiedMessage === provider.name ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{nudgeMessage}</p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {provider.twitter && (
                      <a 
                        href={`https://twitter.com/messages/compose?recipient_id=${provider.twitter}&text=${encodeURIComponent(nudgeMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                      >
                        Send Twitter DM
                      </a>
                    )}
                    <a 
                      href={`https://bankrsignals.com/providers/${provider.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
                    >
                      View Profile
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {inactiveProviders.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-400">All registered providers have published at least one signal.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}