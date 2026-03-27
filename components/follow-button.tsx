'use client';

import { useFollows } from '@/hooks/useFollows';
import { Heart, HeartHandshake } from 'lucide-react';

interface FollowButtonProps {
  providerAddress: string;
  providerName: string;
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export function FollowButton({ 
  providerAddress, 
  providerName, 
  variant = 'default',
  className = '' 
}: FollowButtonProps) {
  const { isFollowing, toggleFollow, isLoaded } = useFollows();

  if (!isLoaded) {
    return (
      <div className={`animate-pulse bg-[#2a2a2a] rounded-lg ${
        variant === 'icon-only' ? 'w-8 h-8' : variant === 'compact' ? 'w-16 h-6' : 'w-20 h-8'
      } ${className}`} />
    );
  }

  const following = isFollowing(providerAddress);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFollow(providerAddress, providerName);
  };

  if (variant === 'icon-only') {
    return (
      <button
        onClick={handleClick}
        className={`p-1.5 rounded-full transition-all ${
          following 
            ? 'text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20' 
            : 'text-[#737373] hover:text-pink-400 hover:bg-pink-500/10'
        } ${className}`}
        title={following ? 'Unfollow' : 'Follow'}
      >
        {following ? <HeartHandshake className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={`px-2 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 ${
          following
            ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/30'
            : 'bg-[#1a1a1a] text-[#737373] hover:text-pink-400 hover:bg-pink-500/10 border border-[#2a2a2a] hover:border-pink-500/30'
        } ${className}`}
      >
        {following ? <HeartHandshake className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
        {following ? 'Following' : 'Follow'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2 ${
        following
          ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/30'
          : 'bg-[#1a1a1a] text-[#737373] hover:text-white hover:bg-pink-500/10 border border-[#2a2a2a] hover:border-pink-500/30'
      } ${className}`}
    >
      {following ? <HeartHandshake className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
      {following ? 'Following' : 'Follow'}
    </button>
  );
}