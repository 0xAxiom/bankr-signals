import { useState, useEffect, useCallback } from 'react';

interface FollowDetails {
  created_at: string;
  notify_telegram: boolean;
  notify_email: boolean;
  notes: string;
  tags: string[];
}

interface UseProviderFollowReturn {
  isFollowing: boolean;
  followDetails: FollowDetails | null;
  isLoading: boolean;
  error: string | null;
  follow: (preferences?: Partial<FollowDetails>) => Promise<void>;
  unfollow: () => Promise<void>;
  updatePreferences: (preferences: Partial<FollowDetails>) => Promise<void>;
}

export function useProviderFollow(providerAddress: string): UseProviderFollowReturn {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDetails, setFollowDetails] = useState<FollowDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user identifier (can be enhanced with proper auth later)
  const getUserIdentifier = useCallback(() => {
    // Try to get from localStorage or generate anonymous session
    let userIdentifier = localStorage.getItem('user_session');
    if (!userIdentifier) {
      userIdentifier = `anonymous_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('user_session', userIdentifier);
    }
    return userIdentifier;
  }, []);

  const makeRequest = useCallback(async (path: string, options: RequestInit = {}) => {
    const userIdentifier = getUserIdentifier();
    
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-identifier': userIdentifier,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Request failed');
    }

    return response.json();
  }, [getUserIdentifier]);

  // Check follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await makeRequest(`/api/providers/${providerAddress}/follow`);
        
        setIsFollowing(data.following);
        setFollowDetails(data.followDetails);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check follow status');
        console.error('Follow status check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (providerAddress) {
      checkFollowStatus();
    }
  }, [providerAddress, makeRequest]);

  const follow = useCallback(async (preferences: Partial<FollowDetails> = {}) => {
    try {
      setError(null);
      
      const data = await makeRequest(`/api/providers/${providerAddress}/follow`, {
        method: 'POST',
        body: JSON.stringify(preferences),
      });

      setIsFollowing(true);
      setFollowDetails(data.followDetails);
      
      // Dispatch custom event for other components to react
      window.dispatchEvent(new CustomEvent('providerFollowed', { 
        detail: { providerAddress, followDetails: data.followDetails } 
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to follow provider');
      throw err;
    }
  }, [providerAddress, makeRequest]);

  const unfollow = useCallback(async () => {
    try {
      setError(null);
      
      await makeRequest(`/api/providers/${providerAddress}/follow`, {
        method: 'DELETE',
      });

      setIsFollowing(false);
      setFollowDetails(null);
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('providerUnfollowed', { 
        detail: { providerAddress } 
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow provider');
      throw err;
    }
  }, [providerAddress, makeRequest]);

  const updatePreferences = useCallback(async (preferences: Partial<FollowDetails>) => {
    try {
      setError(null);
      
      const data = await makeRequest(`/api/providers/${providerAddress}/follow`, {
        method: 'PATCH',
        body: JSON.stringify(preferences),
      });

      setFollowDetails(data.followDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err;
    }
  }, [providerAddress, makeRequest]);

  return {
    isFollowing,
    followDetails,
    isLoading,
    error,
    follow,
    unfollow,
    updatePreferences,
  };
}