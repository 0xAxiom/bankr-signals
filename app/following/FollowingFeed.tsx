"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Wallet, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { SignalCard } from '../feed/signal-card';
import FollowButton from '@/components/FollowButton';

interface Provider {
  address: string;
  name: string;
  bio: string;
  avatar?: string;
  twitter?: string;
  total_signals: number;
  win_rate: number;
  avg_pnl_pct: number;
}

interface TradeWithProvider {
  id?: string;
  timestamp: string;
  action: "BUY" | "SELL" | "LONG" | "SHORT";
  token: string;
  entryPrice: number;
  leverage?: number;
  txHash?: string;
  exitTxHash?: string;
  pnl?: number;
  status: "open" | "closed" | "stopped";
  collateralUsd?: number;

  providerName: string;
  providerAddress: string;
  confidence?: number;
  reasoning?: string;
}

export default function FollowingFeed() {
  const [userAddress, setUserAddress] = useState<string>('');
  const [followedProviders, setFollowedProviders] = useState<Provider[]>([]);
  const [signals, setSignals] = useState<TradeWithProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock user address for demo - in production, get from wallet connection
  useEffect(() => {
    // This would come from your wallet connection logic
    // For demo purposes, using a placeholder
    const demoAddress = "0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5"; // Axiom's address
    setUserAddress(demoAddress);
  }, []);

  // Fetch followed providers and their signals
  useEffect(() => {
    if (!userAddress) return;

    const fetchFollowingData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get followed providers
        const followResponse = await fetch(`/api/follow?userAddress=${userAddress}`);
        
        if (!followResponse.ok) {
          throw new Error('Failed to fetch followed providers');
        }

        const followData = await followResponse.json();
        
        if (followData.following.length === 0) {
          setFollowedProviders([]);
          setSignals([]);
          setIsLoading(false);
          return;
        }

        setFollowedProviders(followData.following);

        // Get signals from followed providers
        const providerAddresses = followData.following.map((p: Provider) => p.address);
        const signalsResponse = await fetch('/api/signals');
        
        if (!signalsResponse.ok) {
          throw new Error('Failed to fetch signals');
        }

        const allSignals = await signalsResponse.json();
        
        // Filter signals to only show from followed providers and map to expected interface
        const followedSignals = allSignals
          .filter((signal: any) =>
            providerAddresses.includes(signal.provider.toLowerCase())
          )
          .map((signal: any) => ({
            id: signal.id,
            timestamp: signal.timestamp,
            action: signal.action,
            token: signal.token,
            entryPrice: signal.entry_price || signal.entryPrice,
            leverage: signal.leverage,
            txHash: signal.tx_hash || signal.txHash,
            exitTxHash: signal.exit_tx_hash || signal.exitTxHash,
            pnl: signal.pnl_pct || signal.pnl,
            status: signal.status,
            collateralUsd: signal.collateral_usd || signal.collateralUsd,
            providerName: signal.provider_name || signal.providerName,
            providerAddress: signal.provider,
            confidence: signal.confidence,
            reasoning: signal.reasoning,
          }));

        // Sort by timestamp (newest first)
        followedSignals.sort((a: TradeWithProvider, b: TradeWithProvider) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setSignals(followedSignals);

      } catch (error) {
        console.error('Error fetching following data:', error);
        setError('Failed to load your followed providers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowingData();
  }, [userAddress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-2 text-zinc-400">Loading your feed...</span>
      </div>
    );
  }

  if (!userAddress) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <Wallet className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-zinc-400 mb-4">
            Connect your wallet to follow providers and get personalized signals
          </p>
          <Button>
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (followedProviders.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Heart className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Followed Providers</h3>
            <p className="text-zinc-400 mb-4">
              Start following signal providers to see their latest signals in your personalized feed
            </p>
            <Link href="/providers">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Browse Providers
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Suggested Providers to Follow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400 mb-4">
              These providers have strong track records and consistent signal publishing:
            </p>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                <div>
                  <h4 className="font-semibold text-white">ClawdFred_HL</h4>
                  <p className="text-sm text-zinc-400">99% win rate • 238 signals</p>
                </div>
                <FollowButton
                  providerAddress="0x94f5691142f82efc2c9c342e154dc00833796934"
                  providerName="ClawdFred_HL"
                  userAddress={userAddress}
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                <div>
                  <h4 className="font-semibold text-white">Axiom</h4>
                  <p className="text-sm text-zinc-400">12% win rate • 45 signals</p>
                </div>
                <FollowButton
                  providerAddress="0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5"
                  providerName="Axiom"
                  userAddress={userAddress}
                  size="sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Feed</h3>
          <p className="text-zinc-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Followed Providers Summary */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Heart className="h-5 w-5 mr-2 text-red-500" />
            Following {followedProviders.length} Provider{followedProviders.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {followedProviders.map((provider) => (
              <div key={provider.address} className="p-4 bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Link 
                    href={`/providers/${provider.address}`}
                    className="font-semibold text-white hover:text-blue-400 transition-colors"
                  >
                    {provider.name}
                  </Link>
                  <FollowButton
                    providerAddress={provider.address}
                    providerName={provider.name}
                    userAddress={userAddress}
                    size="sm"
                    variant="ghost"
                    showIcon={false}
                  />
                </div>
                <p className="text-sm text-zinc-400">
                  {provider.win_rate}% win rate • {provider.total_signals} signals
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Signals Feed */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          Latest Signals from Your Followed Providers
        </h2>
        
        {signals.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <TrendingUp className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Recent Signals</h3>
              <p className="text-zinc-400">
                Your followed providers haven't published any signals recently. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {signals.map((trade) => (
              <SignalCard
                key={trade.id || `${trade.providerAddress}-${trade.timestamp}`}
                trade={trade}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}