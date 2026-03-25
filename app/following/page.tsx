'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/components/WalletContext';
import { Avatar } from '../avatar';
import FollowButton from '@/components/FollowButton';

interface FollowedProvider {
  provider_address: string;
  created_at: string;
  notify_telegram: boolean;
  notify_email: boolean;
  notes: string;
  tags: string[];
  provider_name?: string;
  provider_bio?: string;
  recent_signals?: number;
  win_rate?: number;
  total_pnl?: number;
}

export default function FollowingPage() {
  const { address, connect, isConnected } = useWallet();
  const [following, setFollowing] = useState<FollowedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFollowing();
  }, [address]);

  const loadFollowing = async () => {
    if (!address) {
      setFollowing([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/following');
      if (!response.ok) {
        throw new Error('Failed to load following');
      }

      const data = await response.json();
      setFollowing(data.following || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <div className="text-6xl mb-6">👋</div>
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-[#737373] mb-8 max-w-md mx-auto">
            Connect your wallet to follow your favorite signal providers and get notified of their latest trades.
          </p>
          <button
            onClick={connect}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center text-red-400">
          Error: {error}
          <button
            onClick={loadFollowing}
            className="ml-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Following</h1>
        <p className="text-[#737373]">
          Signal providers you're following for trade alerts and updates.
        </p>
      </div>

      {following.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📡</div>
          <h2 className="text-xl font-semibold mb-2">No Providers Followed Yet</h2>
          <p className="text-[#737373] mb-6 max-w-md mx-auto">
            Start following signal providers to get notified of their latest trades and build your feed.
          </p>
          <Link
            href="/leaderboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Browse Providers
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {following.map((follow) => (
            <div
              key={follow.provider_address}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <Avatar 
                    address={follow.provider_address}
                    name={follow.provider_name || 'Unknown Provider'}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        href={`/provider/${follow.provider_address}`}
                        className="font-semibold hover:text-blue-400 transition-colors truncate"
                      >
                        {follow.provider_name || 'Unknown Provider'}
                      </Link>
                    </div>
                    
                    {follow.provider_bio && (
                      <p className="text-sm text-[#737373] mb-2 line-clamp-2">
                        {follow.provider_bio}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#737373]">
                      <span>
                        Following since {new Date(follow.created_at).toLocaleDateString()}
                      </span>
                      {follow.recent_signals !== undefined && (
                        <span>{follow.recent_signals} recent signals</span>
                      )}
                      {follow.win_rate !== undefined && (
                        <span className="font-mono">{follow.win_rate}% win rate</span>
                      )}
                      {follow.total_pnl !== undefined && (
                        <span className={`font-mono ${follow.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {follow.total_pnl >= 0 ? '+' : ''}{follow.total_pnl.toFixed(1)}% PnL
                        </span>
                      )}
                    </div>

                    {follow.tags && follow.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {follow.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-[#2a2a2a] text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {follow.notes && (
                      <div className="mt-2 p-2 bg-[#111] border border-[#2a2a2a] rounded text-sm">
                        <strong className="text-[#e5e5e5]">Notes:</strong> {follow.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <div className="flex flex-col items-end gap-1 text-xs text-[#737373] mr-3">
                    {follow.notify_telegram && (
                      <span className="flex items-center gap-1">
                        📱 Telegram alerts
                      </span>
                    )}
                    {follow.notify_email && (
                      <span className="flex items-center gap-1">
                        ✉️ Email alerts
                      </span>
                    )}
                  </div>
                  
                  <FollowButton
                    providerAddress={follow.provider_address}
                    providerName={follow.provider_name || 'Unknown Provider'}
                    userAddress={address}
                    variant="compact"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {following.length > 0 && (
        <div className="mt-8 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
          <h3 className="font-semibold mb-2 text-sm">📱 Notification Settings</h3>
          <p className="text-xs text-[#737373] mb-3">
            Get instant notifications when your followed providers publish new signals.
          </p>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Telegram notifications enabled for {following.filter(f => f.notify_telegram).length} providers</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Email notifications enabled for {following.filter(f => f.notify_email).length} providers</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}