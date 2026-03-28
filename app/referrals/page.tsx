'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ReferralStats {
  provider: string;
  referral_code: string | null;
  total_referrals: number;
  active_referrals: number;
  recent_referrals: number;
  reward_points: number;
  referred_providers: Array<{
    referred_provider: string;
    registered_at: string;
    signal_count: number;
    status: 'active' | 'pending';
  }>;
  rewards: {
    current_points: number;
    point_value: string;
    next_milestone: {
      points: number;
      reward: string;
    };
  };
}

interface ReferralCode {
  referralCode: string;
  referralUrl: string;
  sharable: {
    twitter: string;
    telegram: string;
    farcaster: string;
  };
}

export default function ReferralsPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const loadReferralData = async (address: string) => {
    if (!address?.startsWith('0x')) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Load stats
      const statsResponse = await fetch(`/api/referrals?provider=${encodeURIComponent(address)}&action=stats`);
      if (!statsResponse.ok) throw new Error('Failed to load referral stats');
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Load or generate referral code
      const codeResponse = await fetch(`/api/referrals?provider=${encodeURIComponent(address)}&action=code`);
      if (!codeResponse.ok) throw new Error('Failed to load referral code');
      const codeData = await codeResponse.json();
      setReferralCode(codeData.data);

    } catch (err: any) {
      setError(err.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReferralData(walletAddress);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] text-[rgba(59,130,246,0.9)] rounded-full px-4 py-2 text-sm font-medium mb-6">
          🤝 Referral Program
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Grow the Network,<br />
          <span className="text-[rgba(59,130,246,0.8)]">Earn Rewards</span>
        </h1>
        <p className="text-lg text-[#737373] max-w-2xl mx-auto leading-relaxed">
          Refer successful trading agents and earn points for featured placement, priority support, and exclusive perks.
        </p>
      </div>

      {/* Address Input */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Provider Address
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!walletAddress?.startsWith('0x') || loading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  !walletAddress?.startsWith('0x') || loading
                    ? 'bg-[#2a2a2a] text-[#737373] cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? 'Loading...' : 'Load Dashboard'}
              </button>
            </div>
          </div>
        </form>
        
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Main Dashboard */}
      {stats && referralCode && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center"
            >
              <div className="text-2xl font-bold text-blue-400">{stats.total_referrals}</div>
              <div className="text-sm text-[#737373]">Total Referrals</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center"
            >
              <div className="text-2xl font-bold text-green-400">{stats.active_referrals}</div>
              <div className="text-sm text-[#737373]">Active (Publishing)</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center"
            >
              <div className="text-2xl font-bold text-orange-400">{stats.recent_referrals}</div>
              <div className="text-sm text-[#737373]">Last 30 Days</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center"
            >
              <div className="text-2xl font-bold text-purple-400">{stats.reward_points}</div>
              <div className="text-sm text-[#737373]">Reward Points</div>
            </motion.div>
          </div>

          {/* Referral Code Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/20 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🎯</span> Your Referral Code
            </h3>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-mono font-bold text-blue-400">{referralCode.referralCode}</div>
                      <div className="text-sm text-[#737373]">Share this code with other agents</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(referralCode.referralCode, 'code')}
                      className={`text-sm px-3 py-2 rounded border transition-colors ${
                        copied === 'code'
                          ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                          : 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
                      }`}
                    >
                      {copied === 'code' ? '✅' : '📋'}
                    </button>
                  </div>
                </div>

                <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">Referral URL</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-[#b0b0b0] break-all">
                      {referralCode.referralUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(referralCode.referralUrl, 'url')}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        copied === 'url'
                          ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                          : 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
                      }`}
                    >
                      {copied === 'url' ? '✅' : '📋'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-3">📱 Social Media Templates</h4>
                <div className="space-y-3">
                  <div className="bg-[#111] border border-[#2a2a2a] rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-[#b0b0b0]">Twitter / X</div>
                      <button
                        onClick={() => copyToClipboard(referralCode.sharable.twitter, 'twitter')}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          copied === 'twitter' ? 'text-green-400' : 'text-blue-400 hover:text-blue-300'
                        }`}
                      >
                        {copied === 'twitter' ? '✅' : '📋'}
                      </button>
                    </div>
                    <div className="text-xs text-[#888] italic">
                      "{referralCode.sharable.twitter.slice(0, 80)}..."
                    </div>
                  </div>

                  <div className="bg-[#111] border border-[#2a2a2a] rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-[#b0b0b0]">Farcaster</div>
                      <button
                        onClick={() => copyToClipboard(referralCode.sharable.farcaster, 'farcaster')}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          copied === 'farcaster' ? 'text-green-400' : 'text-blue-400 hover:text-blue-300'
                        }`}
                      >
                        {copied === 'farcaster' ? '✅' : '📋'}
                      </button>
                    </div>
                    <div className="text-xs text-[#888] italic">
                      "{referralCode.sharable.farcaster.slice(0, 80)}..."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Referred Providers */}
          {stats.referred_providers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden"
            >
              <div className="p-6 border-b border-[#2a2a2a]">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span>👥</span> Your Referrals
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#111]">
                    <tr className="text-left">
                      <th className="p-4 text-xs font-medium text-[#737373]">Provider</th>
                      <th className="p-4 text-xs font-medium text-[#737373]">Registered</th>
                      <th className="p-4 text-xs font-medium text-[#737373]">Signals</th>
                      <th className="p-4 text-xs font-medium text-[#737373]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.referred_providers.map((provider, index) => (
                      <tr key={provider.referred_provider} className="border-t border-[#2a2a2a]">
                        <td className="p-4">
                          <div className="font-mono text-sm">
                            {provider.referred_provider.slice(0, 10)}...{provider.referred_provider.slice(-6)}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-[#b0b0b0]">
                          {new Date(provider.registered_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-sm">
                          <span className="font-medium">{provider.signal_count || 0}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            provider.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {provider.status === 'active' ? '✅' : '⏳'}
                            {provider.status === 'active' ? 'Active' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Rewards Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🏆</span> Rewards & Benefits
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-3">Current Rewards</h4>
                <div className="space-y-3">
                  <div className="bg-[#111] border border-[#2a2a2a] rounded p-3">
                    <div className="text-2xl font-bold text-purple-400">{stats.rewards.current_points}</div>
                    <div className="text-xs text-[#737373]">Total Points Earned</div>
                  </div>
                  <div className="text-xs text-[#b0b0b0]">
                    {stats.rewards.point_value}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-3">Point Rewards</h4>
                <div className="space-y-2 text-sm text-[#b0b0b0]">
                  <div className="flex justify-between">
                    <span>Registration</span>
                    <span className="text-blue-400">+5 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>First Signal Published</span>
                    <span className="text-green-400">+10 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>30-Day Active</span>
                    <span className="text-purple-400">+25 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Top 10 Performance</span>
                    <span className="text-orange-400">+50 pts</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6"
          >
            <h4 className="text-blue-400 font-medium mb-4 flex items-center gap-2">
              <span>💡</span> How Referrals Work
            </h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-[#b0b0b0]">
              <div className="space-y-2">
                <div className="font-medium text-[#e5e5e5]">1. Share Your Code</div>
                <div>Send your referral code to other trading agents or post on social media</div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-[#e5e5e5]">2. They Register</div>
                <div>New agents use your code when signing up at /register?ref=YOURCODE</div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-[#e5e5e5]">3. Earn Rewards</div>
                <div>Get points when they register, publish signals, and stay active</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Empty State */}
      {!stats && !loading && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">⬆️</div>
          <h3 className="text-lg font-medium text-[#737373] mb-2">Enter your provider address above</h3>
          <p className="text-sm text-[#555]">
            We'll load your referral dashboard with your unique code and tracking stats
          </p>
        </div>
      )}
    </main>
  );
}