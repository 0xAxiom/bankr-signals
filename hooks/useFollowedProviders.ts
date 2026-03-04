"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "bankr-followed-providers";
const USER_ID_KEY = "bankr-user-id";

// Generate a persistent user ID for the browser session
function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    // Generate a unique ID - could be wallet address or browser fingerprint
    // For now, using a simple random ID. In production, this would be a wallet address
    userId = `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export function useFollowedProviders() {
  const [followedProviders, setFollowedProviders] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string>("");

  // Initialize user ID and load followed providers
  useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);
    loadFollowedProviders(currentUserId);
  }, []);

  const loadFollowedProviders = async (userIdToLoad: string) => {
    try {
      const response = await fetch(`/api/follows?user_id=${encodeURIComponent(userIdToLoad)}`);
      if (response.ok) {
        const data = await response.json();
        setFollowedProviders(new Set(data.followedProviders || []));
      } else {
        // Fallback to localStorage for backward compatibility
        await migrateFromLocalStorage(userIdToLoad);
      }
    } catch (error) {
      console.warn("Failed to load followed providers from API, falling back to localStorage:", error);
      await migrateFromLocalStorage(userIdToLoad);
    } finally {
      setIsLoaded(true);
    }
  };

  const migrateFromLocalStorage = async (userIdForMigration: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const providers = Array.isArray(parsed) ? parsed : [];
        setFollowedProviders(new Set(providers));
        
        // Migrate to server if we have providers
        if (providers.length > 0) {
          try {
            for (const providerAddress of providers) {
              await followProvider(providerAddress, false); // Don't update state, just sync to server
            }
            // Clear localStorage after successful migration
            localStorage.removeItem(STORAGE_KEY);
          } catch (migrationError) {
            console.warn("Failed to migrate follows to server:", migrationError);
          }
        }
      } catch (e) {
        console.warn("Failed to parse followed providers from localStorage:", e);
        setFollowedProviders(new Set());
      }
    } else {
      setFollowedProviders(new Set());
    }
  };

  const followProvider = async (address: string, updateState = true) => {
    const normalizedAddress = address.toLowerCase();
    
    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, providerAddress: normalizedAddress })
      });

      if (response.ok) {
        const data = await response.json();
        if (updateState) {
          setFollowedProviders(new Set(data.followedProviders || []));
        }
        return data;
      } else {
        throw new Error('Failed to follow provider');
      }
    } catch (error) {
      console.error("Follow API error, falling back to localStorage:", error);
      // Fallback to localStorage
      if (updateState) {
        const newSet = new Set(followedProviders);
        newSet.add(normalizedAddress);
        setFollowedProviders(newSet);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      }
      throw error;
    }
  };

  const unfollowProvider = async (address: string) => {
    const normalizedAddress = address.toLowerCase();
    
    try {
      const response = await fetch('/api/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, providerAddress: normalizedAddress })
      });

      if (response.ok) {
        const data = await response.json();
        setFollowedProviders(new Set(data.followedProviders || []));
        return data;
      } else {
        throw new Error('Failed to unfollow provider');
      }
    } catch (error) {
      console.error("Unfollow API error, falling back to localStorage:", error);
      // Fallback to localStorage
      const newSet = new Set(followedProviders);
      newSet.delete(normalizedAddress);
      setFollowedProviders(newSet);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      throw error;
    }
  };

  const isFollowing = (address: string) => {
    return followedProviders.has(address.toLowerCase());
  };

  const toggleFollow = async (address: string) => {
    try {
      if (isFollowing(address)) {
        await unfollowProvider(address);
      } else {
        await followProvider(address);
      }
    } catch (error) {
      console.error("Toggle follow error:", error);
      // Error handling is already done in individual functions
    }
  };

  return {
    followedProviders: Array.from(followedProviders),
    isFollowing,
    followProvider,
    unfollowProvider,
    toggleFollow,
    isLoaded,
    userId,
  };
}