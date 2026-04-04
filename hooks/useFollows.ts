'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/components/WalletContext';

export interface FollowedProvider {
  address: string;
  name: string;
  bio?: string;
  avatar?: string;
}

export function useFollows() {
  const { address, isConnected } = useWallet();
  const [follows, setFollows] = useState<FollowedProvider[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollows = async () => {
    if (!address || !isConnected) {
      setFollows([]);
      setIsLoaded(true);
      return;
    }

    try {
      const response = await fetch(`/api/follow?userAddress=${address}`);
      if (response.ok) {
        const data = await response.json();
        setFollows(data.following || []);
      } else {
        console.error('Failed to fetch follows:', await response.text());
        setFollows([]);
      }
    } catch (err) {
      console.error('Error fetching follows:', err);
      setError('Failed to load followed providers');
      setFollows([]);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchFollows();
  }, [address, isConnected]);

  const followProvider = async (providerAddress: string, name?: string) => {
    if (!address) return;
    
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          providerAddress,
          action: 'follow'
        })
      });

      if (response.ok) {
        // Refresh the follows list
        await fetchFollows();
      }
    } catch (err) {
      console.error('Error following provider:', err);
    }
  };

  const unfollowProvider = async (providerAddress: string) => {
    if (!address) return;

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          providerAddress,
          action: 'unfollow'
        })
      });

      if (response.ok) {
        // Refresh the follows list
        await fetchFollows();
      }
    } catch (err) {
      console.error('Error unfollowing provider:', err);
    }
  };

  const isFollowing = (providerAddress: string) => {
    return follows.some(f => f.address?.toLowerCase() === providerAddress?.toLowerCase());
  };

  const toggleFollow = async (providerAddress: string, name?: string) => {
    if (isFollowing(providerAddress)) {
      await unfollowProvider(providerAddress);
    } else {
      await followProvider(providerAddress, name);
    }
  };

  return {
    follows,
    isLoaded,
    error,
    followProvider,
    unfollowProvider,
    isFollowing,
    toggleFollow,
    followCount: follows.length,
    refetch: fetchFollows,
  };
}