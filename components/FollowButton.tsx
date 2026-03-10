'use client';

import React, { useState } from 'react';
import { useProviderFollow } from '@/hooks/useProviderFollow';

interface FollowButtonProps {
  providerAddress: string;
  providerName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline';
  showFollowerCount?: boolean;
  followerCount?: number;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({ 
  providerAddress, 
  providerName,
  size = 'md',
  variant = 'outline',
  showFollowerCount = false,
  followerCount = 0,
  className = '',
  onFollowChange
}: FollowButtonProps) {
  const { isFollowing, isLoading, error, follow, unfollow } = useProviderFollow(providerAddress);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleToggleFollow = async () => {
    try {
      setIsActionLoading(true);
      
      if (isFollowing) {
        await unfollow();
        onFollowChange?.(false);
      } else {
        await follow({
          notify_telegram: true,
          notify_email: false,
        });
        onFollowChange?.(true);
      }
    } catch (err) {
      console.error('Follow action error:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const getVariantClasses = () => {
    if (isFollowing) {
      return 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20';
    }
    
    if (variant === 'primary') {
      return 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700';
    }
    
    return 'bg-transparent border-[#3a3a3a] text-[#a3a3a3] hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-400';
  };

  const getIcon = () => {
    if (isActionLoading || isLoading) {
      return (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="32">
            <animate attributeName="stroke-dashoffset" dur="1s" values="32;0;32" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    }
    
    if (isFollowing) {
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
      );
    }
    
    return (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    );
  };

  const getText = () => {
    if (isFollowing) {
      return size === 'sm' ? 'Following' : 'Following';
    }
    return size === 'sm' ? 'Follow' : 'Follow';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleToggleFollow}
        disabled={isActionLoading || isLoading}
        className={`
          inline-flex items-center gap-2 rounded-lg border transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getSizeClasses()}
          ${getVariantClasses()}
        `}
        title={isFollowing ? `Unfollow ${providerName}` : `Follow ${providerName}`}
      >
        {getIcon()}
        <span className="font-medium">{getText()}</span>
      </button>

      {showFollowerCount && (
        <span className="text-xs text-[#737373]">
          {(followerCount + (isFollowing ? 1 : 0)).toLocaleString()} followers
        </span>
      )}

      {error && (
        <div className="text-xs text-red-400 ml-2">
          {error}
        </div>
      )}
    </div>
  );
}

// Compact version for cards/lists
export function FollowIconButton({ 
  providerAddress, 
  providerName,
  className = '' 
}: {
  providerAddress: string;
  providerName: string;
  className?: string;
}) {
  return (
    <FollowButton
      providerAddress={providerAddress}
      providerName={providerName}
      size="sm"
      variant="outline"
      className={className}
    />
  );
}

// Enhanced version with preferences modal (for future implementation)
export function FollowButtonWithPreferences({ 
  providerAddress, 
  providerName,
  className = '' 
}: {
  providerAddress: string;
  providerName: string;
  className?: string;
}) {
  const [showPreferences, setShowPreferences] = useState(false);
  
  return (
    <>
      <FollowButton
        providerAddress={providerAddress}
        providerName={providerName}
        className={className}
        onFollowChange={(isFollowing) => {
          if (isFollowing) {
            setShowPreferences(true);
          }
        }}
      />
      
      {/* Preferences modal would go here */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Follow Preferences</h3>
            <p className="text-sm text-[#737373] mb-4">
              Customize how you want to be notified about {providerName}'s signals.
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-[#3a3a3a]" defaultChecked />
                <span className="text-sm">Telegram notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-[#3a3a3a]" />
                <span className="text-sm">Email notifications</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreferences(false)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="px-4 py-2 border border-[#3a3a3a] text-[#a3a3a3] rounded-lg text-sm hover:border-[#4a4a4a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}