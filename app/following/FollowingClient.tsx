'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Provider {
  address: string;
  name: string;
  avatar?: string;
  verified: boolean;
  total_signals: number;
  win_rate: number;
  followers: number;
}

interface Signal {
  id: string;
  direction: string;
  token_symbol: string;
  token_address?: string;
  reasoning: string;
  confidence: number;
  collateralUsd: number;
  leverage?: number;
  timestamp: string;
  status: 'open' | 'closed';
  pnl?: number;
  provider: Provider;
}

interface FollowingData {
  signals: Signal[];
  providers: Provider[];
  totalCount: number;
  hasMore: boolean;
  following: number;
  message?: string;
}

export default function FollowingClient() {
  const [data, setData] = useState<FollowingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed'>('all');
  const [page, setPage] = useState(0);

  const getUserIdentifier = useCallback(() => {
    let userIdentifier = localStorage.getItem('user_session');
    if (!userIdentifier) {
      userIdentifier = `anonymous_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('user_session', userIdentifier);
    }
    return userIdentifier;
  }, []);

  const fetchFollowingFeed = useCallback(async (status?: string, offset = 0) => {
    try {
      setError(null);
      
      const userIdentifier = getUserIdentifier();
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
      });
      
      if (status && status !== 'all') {
        params.append('status', status);
      }

      const response = await fetch(`/api/following?${params}`, {
        headers: {
          'x-user-identifier': userIdentifier,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch following feed');
      }

      const feedData = await response.json();
      setData(feedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load following feed');
    } finally {
      setIsLoading(false);
    }
  }, [getUserIdentifier]);

  useEffect(() => {
    setIsLoading(true);
    setPage(0);
    fetchFollowingFeed(activeTab);
  }, [activeTab, fetchFollowingFeed]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const formatPnL = (pnl?: number) => {
    if (pnl === undefined || pnl === null) return null;
    const sign = pnl >= 0 ? '+' : '';
    const color = pnl >= 0 ? 'text-green-400' : 'text-red-400';
    return (
      <span className={`text-xs font-medium ${color}`}>
        {sign}${Math.abs(pnl).toFixed(2)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 mb-6">
          {['All', 'Open', 'Closed'].map((tab) => (
            <div key={tab} className="h-8 w-16 bg-[#2a2a2a] rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#2a2a2a] rounded-full" />
                <div className="h-4 w-24 bg-[#2a2a2a] rounded" />
                <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-[#2a2a2a] rounded" />
                <div className="h-4 w-3/4 bg-[#2a2a2a] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">Error loading following feed</div>
        <p className="text-sm text-[#737373] mb-4">{error}</p>
        <button 
          onClick={() => {
            setIsLoading(true);
            fetchFollowingFeed(activeTab);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data || data.following === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-lg font-semibold text-[#e5e5e5] mb-2">No Following Yet</h3>
        <p className="text-sm text-[#737373] mb-6 max-w-md mx-auto">
          Follow your favorite traders to see their latest signals here. 
          Get personalized notifications and never miss profitable opportunities.
        </p>
        <div className="flex gap-3 justify-center">
          <Link 
            href="/leaderboard"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Discover Top Traders
          </Link>
          <Link 
            href="/feed"
            className="px-6 py-3 border border-[#3a3a3a] text-[#a3a3a3] rounded-lg hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
          >
            Browse All Signals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-[#1a1a1a] p-1 rounded-lg border border-[#2a2a2a] w-fit">
        {[
          { key: 'all', label: 'All Signals' },
          { key: 'open', label: 'Open Positions' },
          { key: 'closed', label: 'Closed Trades' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-[#737373] hover:text-[#e5e5e5] hover:bg-[#2a2a2a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Following Stats */}
      <div className="flex items-center gap-4 mb-6 text-sm text-[#737373]">
        <span>Following {data.following} traders</span>
        <span>•</span>
        <span>{data.totalCount} total signals</span>
        {data.signals.filter(s => s.status === 'open').length > 0 && (
          <>
            <span>•</span>
            <span className="text-orange-400">
              {data.signals.filter(s => s.status === 'open').length} live positions
            </span>
          </>
        )}
      </div>

      {/* Signals List */}
      <div className="space-y-4">
        {data.signals.map((signal) => (
          <div key={signal.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 hover:border-[#3a3a3a] transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link href={`/provider/${signal.provider.name}`}>
                  <img 
                    src={signal.provider.avatar || '/default-avatar.png'} 
                    alt={signal.provider.name}
                    className="w-8 h-8 rounded-full border border-[#2a2a2a] hover:border-blue-500/50 transition-colors"
                  />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/provider/${signal.provider.name}`} className="font-medium text-[#e5e5e5] hover:text-blue-400 transition-colors">
                      {signal.provider.name}
                    </Link>
                    {signal.provider.verified && (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-[#737373]">
                    {formatTimeAgo(signal.timestamp)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  signal.status === 'open' 
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}>
                  {signal.status.toUpperCase()}
                </div>
                {signal.pnl !== undefined && formatPnL(signal.pnl)}
              </div>
            </div>

            {/* Signal Details */}
            <div className="flex items-start gap-4 mb-3">
              <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                signal.direction === 'LONG' || signal.direction === 'BUY'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {signal.direction}
              </div>
              <div>
                <div className="font-medium text-[#e5e5e5] mb-1">
                  {signal.token_symbol}
                  {signal.leverage && signal.leverage > 1 && (
                    <span className="ml-2 text-xs text-orange-400">{signal.leverage}x</span>
                  )}
                </div>
                <div className="text-sm text-[#737373]">
                  ${signal.collateralUsd?.toLocaleString() || 'N/A'} • {signal.confidence}% confidence
                </div>
              </div>
            </div>

            {/* Reasoning */}
            {signal.reasoning && (
              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
                <div className="text-sm text-[#e5e5e5] leading-relaxed">
                  {signal.reasoning}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Load More */}
        {data.hasMore && (
          <div className="text-center py-6">
            <button 
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                fetchFollowingFeed(activeTab, newPage * 20);
              }}
              className="px-6 py-3 border border-[#3a3a3a] text-[#a3a3a3] rounded-lg hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
            >
              Load More Signals
            </button>
          </div>
        )}

        {data.signals.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-[#e5e5e5] mb-2">
              No {activeTab === 'all' ? '' : activeTab} signals yet
            </h3>
            <p className="text-sm text-[#737373] mb-4">
              Your followed traders haven't published any {activeTab === 'all' ? '' : activeTab} signals yet.
            </p>
            <Link 
              href="/feed"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Browse all signals →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}