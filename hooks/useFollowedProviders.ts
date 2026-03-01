"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "bankr-followed-providers";

export function useFollowedProviders() {
  const [followedProviders, setFollowedProviders] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFollowedProviders(new Set(Array.isArray(parsed) ? parsed : []));
      } catch (e) {
        console.warn("Failed to parse followed providers from localStorage:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const followProvider = (address: string) => {
    const normalizedAddress = address.toLowerCase();
    const newSet = new Set(followedProviders);
    newSet.add(normalizedAddress);
    setFollowedProviders(newSet);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
  };

  const unfollowProvider = (address: string) => {
    const normalizedAddress = address.toLowerCase();
    const newSet = new Set(followedProviders);
    newSet.delete(normalizedAddress);
    setFollowedProviders(newSet);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
  };

  const isFollowing = (address: string) => {
    return followedProviders.has(address.toLowerCase());
  };

  const toggleFollow = (address: string) => {
    if (isFollowing(address)) {
      unfollowProvider(address);
    } else {
      followProvider(address);
    }
  };

  return {
    followedProviders: Array.from(followedProviders),
    isFollowing,
    followProvider,
    unfollowProvider,
    toggleFollow,
    isLoaded,
  };
}