"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { Avatar } from "../avatar";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";

interface FollowedProvider {
  address: string;
  name: string;
  bio?: string;
  avatar?: string;
  pnl_pct: number;
  win_rate: number;
  signal_count: number;
  followers: number;
  last_signal_at?: string;
  latest_signal?: {
    action: string;
    token: string;
    timestamp: string;
    reasoning?: string;
  };
}

export default function FollowingPageClient() {
  const { address, isConnected, connect } = useWallet();
  const [followedProviders, setFollowedProviders] = useState<FollowedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFollowedProviders = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/following`, {
          headers: {
            'x-user-address': address,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setFollowedProviders(data.providers || []);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load followed providers');
        }
      } catch (err) {
        setError('Failed to load followed providers');
        console.error('Error loading followed providers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowedProviders();
  }, [address]);

  const handleUnfollow = (providerAddress: string) => {
    setFollowedProviders(prev => 
      prev.filter(provider => provider.address !== providerAddress)
    );
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
          <p className="text-[#737373] text-sm mb-6">
            Connect your wallet to see providers you're following and get personalized updates
          </p>
        </div>
        <button
          onClick={connect}
          className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#2a2a2a] rounded-full" />
              <div className="flex-1">
                <div className="h-5 bg-[#2a2a2a] rounded w-32 mb-2" />
                <div className="h-4 bg-[#2a2a2a] rounded w-48 mb-3" />
                <div className="flex gap-6">
                  <div className="h-4 bg-[#2a2a2a] rounded w-16" />
                  <div className="h-4 bg-[#2a2a2a] rounded w-16" />
                  <div className="h-4 bg-[#2a2a2a] rounded w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">⚠️ {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-sm rounded-lg hover:border-[#3a3a3a] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (followedProviders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">No Followed Providers</h3>
          <p className="text-[#737373] text-sm mb-6">
            Start following providers to get personalized updates on their latest signals
          </p>
        </div>
        <Link 
          href="/leaderboard"
          className="inline-flex px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Providers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {followedProviders.map((provider) => (
        <div key={provider.address} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 hover:border-[#3a3a3a] transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Avatar 
                address={provider.address} 
                name={provider.name} 
                avatarUrl={provider.avatar} 
                size="md" 
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Link 
                    href={`/provider/${provider.address}`}
                    className="font-medium hover:text-[rgba(34,197,94,0.6)] transition-colors"
                  >
                    {provider.name}
                  </Link>
                  <span className="text-xs text-[#737373] font-mono">
                    {provider.followers} followers
                  </span>
                </div>
                {provider.bio && (
                  <p className="text-sm text-[#737373] mb-3">{provider.bio}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="text-xs">
                    <span className="text-[#737373]">PnL: </span>
                    <span className={provider.pnl_pct >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}>
                      {provider.pnl_pct >= 0 ? "+" : ""}{provider.pnl_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-[#737373]">Win Rate: </span>
                    <span className="text-[#e5e5e5]">{provider.win_rate}%</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-[#737373]">Signals: </span>
                    <span className="text-[#e5e5e5]">{provider.signal_count}</span>
                  </div>
                  {provider.last_signal_at && (
                    <div className="text-xs text-[#737373]">
                      Last signal: {new Date(provider.last_signal_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {provider.latest_signal && (
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-md p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-[#737373]">Latest Signal:</span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        provider.latest_signal.action === 'BUY' || provider.latest_signal.action === 'LONG'
                          ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]"
                          : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"
                      }`}>
                        {provider.latest_signal.action} {provider.latest_signal.token}
                      </span>
                      <span className="text-xs text-[#737373] font-mono">
                        {new Date(provider.latest_signal.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {provider.latest_signal.reasoning && (
                      <p className="text-xs text-[#a5a5a5] leading-relaxed">
                        {provider.latest_signal.reasoning}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-shrink-0 ml-4">
              <FollowButton
                providerAddress={provider.address}
                providerName={provider.name}
                userAddress={address}
                variant="compact"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}