'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/components/WalletContext';

interface UseFollowsReturn {
  followCount: number;
  followedProviders: string[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  refreshFollows: () => Promise<void>;
}

export function useFollows(): UseFollowsReturn {
  const { address } = useWallet();
  const [followCount, setFollowCount] = useState(0);
  const [followedProviders, setFollowedProviders] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollows = async () => {
    if (!address) {
      setFollowCount(0);
      setFollowedProviders([]);
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/following/count', {
        headers: {
          'x-user-address': address,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFollowCount(data.count || 0);
        setFollowedProviders(data.providers || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch follows');
        setFollowCount(0);
        setFollowedProviders([]);
      }
    } catch (err) {
      console.error('Error fetching follows:', err);
      setError('Network error');
      setFollowCount(0);
      setFollowedProviders([]);
    } finally {
      setIsLoading(false);
      setIsLoaded(true);
    }
  };

  const refreshFollows = async () => {
    await fetchFollows();
  };

  useEffect(() => {
    fetchFollows();
  }, [address]);

  return {
    followCount,
    followedProviders,
    isLoaded,
    isLoading,
    error,
    refreshFollows,
  };
}