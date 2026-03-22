"use client";

import { useState, useEffect } from 'react';
import { useFollowedProviders } from '../../hooks/useFollowedProviders';
import { SignalCard } from './signal-card';
import { TimeFilter, type TimeFilter as TimeFilterType } from './time-filter';

interface PersonalizedFeedProps {
  allTrades: any[];
}

export function PersonalizedFeed({ allTrades }: PersonalizedFeedProps) {
  const [activeTab, setActiveTab] = useState<'following' | 'all'>('following');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const { followedProviders, isLoaded } = useFollowedProviders();

  // Auto-switch to 'all' if user has no followed providers
  useEffect(() => {
    if (isLoaded && followedProviders.length === 0 && activeTab === 'following') {
      setActiveTab('all');
    }
  }, [isLoaded, followedProviders.length, activeTab]);

  // Filter trades based on active tab and time filter
  const getFilteredTrades = () => {
    let trades = activeTab === 'following' 
      ? allTrades.filter(trade => followedProviders.includes(trade.providerAddress))
      : allTrades;

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = Date.now();
      const filterMs = {
        'today': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000,
        'month': 30 * 24 * 60 * 60 * 1000
      }[timeFilter];
      
      if (filterMs) {
        trades = trades.filter(trade => 
          now - new Date(trade.timestamp).getTime() < filterMs
        );
      }
    }

    return trades;
  };

  // Calculate signal counts for each time filter
  const getSignalCounts = () => {
    const baseTrades = activeTab === 'following' 
      ? allTrades.filter(trade => followedProviders.includes(trade.providerAddress))
      : allTrades;

    const now = Date.now();
    return {
      all: baseTrades.length,
      today: baseTrades.filter(trade => now - new Date(trade.timestamp).getTime() < 24 * 60 * 60 * 1000).length,
      week: baseTrades.filter(trade => now - new Date(trade.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000).length,
      month: baseTrades.filter(trade => now - new Date(trade.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000).length,
    };
  };

  const filteredTrades = getFilteredTrades();
  const followingTradeCount = allTrades.filter(trade => 
    followedProviders.includes(trade.providerAddress)
  ).length;

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-[#1a1a1a] rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#1a1a1a] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feed Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('following')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'following'
                ? 'bg-[rgba(34,197,94,0.15)] text-[rgba(34,197,94,0.9)] border border-[rgba(34,197,94,0.3)]'
                : 'text-[#737373] hover:text-[#e5e5e5] hover:bg-[#2a2a2a]'
            }`}
            disabled={followedProviders.length === 0}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">★</span>
              Following
              {followedProviders.length > 0 && (
                <span className="bg-[rgba(34,197,94,0.2)] text-[rgba(34,197,94,0.8)] px-1.5 py-0.5 rounded text-xs font-mono">
                  {followingTradeCount}
                </span>
              )}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-[rgba(59,130,246,0.15)] text-[rgba(59,130,246,0.9)] border border-[rgba(59,130,246,0.3)]'
                : 'text-[#737373] hover:text-[#e5e5e5] hover:bg-[#2a2a2a]'
            }`}
          >
            <span className="flex items-center gap-2">
              All Signals
              <span className="bg-[rgba(59,130,246,0.2)] text-[rgba(59,130,246,0.8)] px-1.5 py-0.5 rounded text-xs font-mono">
                {allTrades.length}
              </span>
            </span>
          </button>
        </div>

        <TimeFilter 
          activeFilter={timeFilter} 
          onFilterChange={setTimeFilter}
          signalCounts={getSignalCounts()}
        />
      </div>

      {/* Empty State for Following */}
      {activeTab === 'following' && followedProviders.length === 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">👋</div>
          <h3 className="text-lg font-medium mb-2">Welcome to your personalized feed!</h3>
          <p className="text-[#737373] mb-6 max-w-md mx-auto">
            Follow traders you're interested in to see their latest signals here. 
            Start by exploring the <a href="/leaderboard" className="text-blue-400 hover:text-blue-300 underline">leaderboard</a> to find top performers.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('all')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Browse All Signals
            </button>
            <a 
              href="/leaderboard"
              className="px-4 py-2 border border-[#2a2a2a] hover:bg-[#1a1a1a] rounded-lg font-medium transition-colors"
            >
              Find Traders
            </a>
          </div>
        </div>
      )}

      {/* Empty State for Following with Filters */}
      {activeTab === 'following' && followedProviders.length > 0 && filteredTrades.length === 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center">
          <div className="text-2xl mb-3">📅</div>
          <h3 className="font-medium mb-2">No signals in this time period</h3>
          <p className="text-[#737373] text-sm mb-4">
            Your followed providers haven't published signals in the selected timeframe.
          </p>
          <button
            onClick={() => setTimeFilter('all')}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Show All Time
          </button>
        </div>
      )}

      {/* Signals Grid */}
      {filteredTrades.length > 0 && (
        <>
          {/* Summary Stats for Following */}
          {activeTab === 'following' && followedProviders.length > 0 && (
            <div className="bg-gradient-to-br from-[rgba(34,197,94,0.05)] to-[rgba(59,130,246,0.05)] border border-[rgba(34,197,94,0.2)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">★</span>
                <h3 className="font-medium text-[rgba(34,197,94,0.9)]">Your Followed Traders</h3>
              </div>
              <div className="text-sm text-[#b0b0b0] space-y-1">
                <div>Following {followedProviders.length} trader{followedProviders.length !== 1 ? 's' : ''}</div>
                <div>Showing {filteredTrades.length} signal{filteredTrades.length !== 1 ? 's' : ''}</div>
                {timeFilter !== 'all' && (
                  <div className="text-xs text-[#737373]">
                    Filtered to last {timeFilter === 'today' ? '24 hours' : timeFilter === 'week' ? '7 days' : '30 days'}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredTrades.map((trade, idx) => (
              <SignalCard 
                key={`${trade.id}-${idx}`} 
                trade={trade}
                isFollowed={followedProviders.includes(trade.providerAddress)}
                showFollowBadge={activeTab === 'all'}
              />
            ))}
          </div>

          {/* Load More / Pagination could go here in the future */}
          {filteredTrades.length > 20 && (
            <div className="text-center py-6">
              <p className="text-sm text-[#737373]">
                Showing {filteredTrades.length} signals
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}