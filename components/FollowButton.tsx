'use client';

import { useState, useEffect } from 'react';

interface FollowButtonProps {
  providerAddress: string;
  providerName: string;
  userAddress?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

export default function FollowButton({ 
  providerAddress, 
  providerName,
  userAddress, 
  variant = 'default',
  className = ''
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/providers/${providerAddress}/follow`);
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.following);
        }
      } catch (error) {
        console.error('Failed to check follow status:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    checkFollowStatus();
  }, [providerAddress]);

  const handleFollow = async () => {
    setLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/providers/${providerAddress}/follow`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify({
          notify_telegram: true,
          notify_email: false
        }) : undefined
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
      } else {
        const error = await response.json();
        alert(`Failed to ${isFollowing ? 'unfollow' : 'follow'} provider: ${error.error}`);
      }
    } catch (error) {
      console.error('Follow error:', error);
      alert(`Failed to ${isFollowing ? 'unfollow' : 'follow'} provider`);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || initialLoading;

  if (variant === 'compact') {
    return (
      <button
        onClick={handleFollow}
        disabled={isDisabled}
        className={`
          px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
          ${isFollowing 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
            : 'bg-gray-800 text-gray-300 border border-gray-600 hover:border-gray-500'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
      >
        {initialLoading ? '...' : loading ? '...' : isFollowing ? '✓ Following' : '+ Follow'}
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isDisabled}
      className={`
        px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
        ${isFollowing 
          ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30' 
          : 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {initialLoading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : loading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </span>
      ) : isFollowing ? (
        <span className="flex items-center gap-2">
          ✓ Following
        </span>
      ) : (
        <span className="flex items-center gap-2">
          + Follow
        </span>
      )}
    </button>
  );
}