"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@/components/WalletContext';
import WalletConnect from '@/components/WalletConnect';
import { Avatar } from '../avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Heart, TrendingUp, Calendar } from 'lucide-react';

interface FollowedProvider {
  address: string;
  name: string;
  bio?: string;
  avatar?: string;
  twitter?: string;
}

interface ProviderWithStats extends FollowedProvider {
  signalCount?: number;
  winRate?: number;
  totalReturn?: number;
  lastSignal?: string;
}

export default function FollowingPage() {
  const { address, isConnected } = useWallet();
  const [followedProviders, setFollowedProviders] = useState<ProviderWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isConnected) {
      setFollowedProviders([]);
      return;
    }

    const fetchFollowedProviders = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/follow?userAddress=${address}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch followed providers');
        }
        
        const data = await response.json();
        
        // Fetch stats for each provider
        const providersWithStats = await Promise.all(
          data.following.map(async (provider: FollowedProvider) => {
            try {
              const statsResponse = await fetch(`/api/signals?provider=${provider.address}&limit=1`);
              if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                return {
                  ...provider,
                  signalCount: statsData.total || 0,
                  lastSignal: statsData.signals?.[0]?.timestamp,
                };
              }
              return provider;
            } catch (error) {
              console.error(`Error fetching stats for ${provider.name}:`, error);
              return provider;
            }
          })
        );
        
        setFollowedProviders(providersWithStats);
      } catch (error) {
        console.error('Error fetching followed providers:', error);
        setError('Failed to load followed providers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFollowedProviders();
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-[#737373] mx-auto mb-6" />
          <h1 className="text-2xl font-semibold mb-4">Following</h1>
          <p className="text-[#737373] mb-8 max-w-md mx-auto">
            Connect your wallet to see and manage the signal providers you follow.
          </p>
          <WalletConnect size="lg" variant="default" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Following</h1>
          <p className="text-[#737373]">
            Providers you follow ({followedProviders.length})
          </p>
        </div>
        <div className="flex items-center gap-4">
          <WalletConnect />
        </div>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[rgba(34,197,94,0.6)]"></div>
          <p className="text-[#737373] mt-4">Loading your followed providers...</p>
        </div>
      )}

      {error && (
        <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.6)] rounded-lg p-4 mb-6">
          <p className="text-[rgba(239,68,68,0.8)] text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && followedProviders.length === 0 && (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-[#737373] mx-auto mb-6" />
          <h2 className="text-xl font-medium mb-4">No providers followed yet</h2>
          <p className="text-[#737373] mb-8 max-w-md mx-auto">
            Discover top-performing signal providers and follow them to get notified of their latest trades.
          </p>
          <Link href="/leaderboard">
            <Button variant="default" size="lg">
              <TrendingUp className="h-4 w-4 mr-2" />
              Browse Providers
            </Button>
          </Link>
        </div>
      )}

      {!loading && !error && followedProviders.length > 0 && (
        <div className="space-y-4">
          {followedProviders.map((provider) => (
            <div
              key={provider.address}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 hover:bg-[#1e1e1e] transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar 
                  address={provider.address} 
                  name={provider.name} 
                  avatarUrl={provider.avatar}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Link href={`/provider/${provider.address}`}>
                      <h3 className="font-semibold hover:text-[rgba(34,197,94,0.6)] transition-colors cursor-pointer">
                        {provider.name}
                      </h3>
                    </Link>
                    {provider.twitter && (
                      <a 
                        href={`https://x.com/${provider.twitter}`} 
                        target="_blank" 
                        rel="noopener"
                        className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors"
                      >
                        @{provider.twitter}
                      </a>
                    )}
                  </div>
                  {provider.bio && (
                    <p className="text-sm text-[#737373] mb-3 max-w-2xl">
                      {provider.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-6 text-xs text-[#737373]">
                    {provider.signalCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{provider.signalCount} signals</span>
                      </div>
                    )}
                    {provider.lastSignal && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Last: {new Date(provider.lastSignal).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/provider/${provider.address}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}