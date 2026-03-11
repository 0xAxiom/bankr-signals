"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, HeartOff } from 'lucide-react';

interface FollowButtonProps {
  providerAddress: string;
  providerName: string;
  userAddress?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showIcon?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export default function FollowButton({
  providerAddress,
  providerName,
  userAddress,
  className = '',
  size = 'md',
  variant = 'outline',
  showIcon = true,
  onFollowChange
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial following status
  useEffect(() => {
    if (!userAddress || !providerAddress) return;

    const checkFollowingStatus = async () => {
      try {
        const response = await fetch(
          `/api/follow?userAddress=${userAddress}&providerAddress=${providerAddress}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.following);
        }
      } catch (error) {
        console.error('Error checking following status:', error);
      }
    };

    checkFollowingStatus();
  }, [userAddress, providerAddress]);

  const handleFollowToggle = async () => {
    if (!userAddress) {
      setError('Please connect your wallet to follow providers');
      return;
    }

    if (userAddress.toLowerCase() === providerAddress.toLowerCase()) {
      setError("You can't follow yourself!");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          providerAddress,
          action: isFollowing ? 'unfollow' : 'follow',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsFollowing(data.following);
        onFollowChange?.(data.following);
      } else {
        setError(data.message || 'Failed to update following status');
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!userAddress) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`${className} opacity-60 cursor-not-allowed`}
        disabled
      >
        {showIcon && <Heart className="h-4 w-4 mr-1" />}
        Follow
      </Button>
    );
  }

  // Don't show follow button for self
  if (userAddress.toLowerCase() === providerAddress.toLowerCase()) {
    return null;
  }

  return (
    <div className="space-y-1">
      <Button
        variant={isFollowing ? 'default' : variant}
        size={size}
        className={className}
        onClick={handleFollowToggle}
        disabled={isLoading}
      >
        {showIcon && (
          isFollowing 
            ? <HeartOff className="h-4 w-4 mr-1" />
            : <Heart className="h-4 w-4 mr-1" />
        )}
        {isLoading 
          ? '...' 
          : isFollowing 
            ? 'Following'
            : 'Follow'
        }
      </Button>
      {error && (
        <p className="text-sm text-red-500 max-w-xs">{error}</p>
      )}
    </div>
  );
}

// Hook for managing follow state
export function useFollowStatus(userAddress?: string, providerAddress?: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userAddress || !providerAddress) return;

    const checkStatus = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/follow?userAddress=${userAddress}&providerAddress=${providerAddress}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.following);
        }
      } catch (error) {
        console.error('Error checking following status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [userAddress, providerAddress]);

  const toggleFollow = async () => {
    if (!userAddress || !providerAddress) return false;

    setIsLoading(true);
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          providerAddress,
          action: isFollowing ? 'unfollow' : 'follow',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsFollowing(data.following);
        return data.following;
      }
      return false;
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isFollowing,
    isLoading,
    toggleFollow,
  };
}