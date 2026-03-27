'use client';

import { useState, useEffect } from 'react';

const FOLLOWS_KEY = 'bankr-follows';

export interface FollowedProvider {
  address: string;
  name: string;
  followedAt: string;
}

export function useFollows() {
  const [follows, setFollows] = useState<FollowedProvider[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(FOLLOWS_KEY);
    if (stored) {
      try {
        setFollows(JSON.parse(stored));
      } catch {
        localStorage.removeItem(FOLLOWS_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

  const saveFollows = (newFollows: FollowedProvider[]) => {
    setFollows(newFollows);
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(newFollows));
  };

  const followProvider = (address: string, name: string) => {
    const newFollows = [...follows, { address, name, followedAt: new Date().toISOString() }];
    saveFollows(newFollows);
  };

  const unfollowProvider = (address: string) => {
    const newFollows = follows.filter(f => f.address !== address);
    saveFollows(newFollows);
  };

  const isFollowing = (address: string) => {
    return follows.some(f => f.address === address);
  };

  const toggleFollow = (address: string, name: string) => {
    if (isFollowing(address)) {
      unfollowProvider(address);
    } else {
      followProvider(address, name);
    }
  };

  return {
    follows,
    isLoaded,
    followProvider,
    unfollowProvider,
    isFollowing,
    toggleFollow,
    followCount: follows.length,
  };
}