"use client";

import { useFollowedProviders } from "../../hooks/useFollowedProviders";

interface FollowButtonProps {
  providerAddress: string;
  providerName: string;
  className?: string;
}

export function FollowButton({ providerAddress, providerName, className = "" }: FollowButtonProps) {
  const { isFollowing, toggleFollow, isLoaded } = useFollowedProviders();

  if (!isLoaded) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] opacity-50 ${className}`}>
        <span className="text-xs font-medium text-[#737373]">Loading...</span>
      </div>
    );
  }

  const following = isFollowing(providerAddress);

  return (
    <button
      onClick={() => toggleFollow(providerAddress)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium ${
        following
          ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.05)] text-[rgba(34,197,94,0.8)] hover:bg-[rgba(34,197,94,0.1)]"
          : "border-[#2a2a2a] bg-[#1a1a1a] text-[#e5e5e5] hover:border-[rgba(34,197,94,0.3)] hover:text-[rgba(34,197,94,0.8)]"
      } ${className}`}
      title={following ? `Unfollow ${providerName}` : `Follow ${providerName}`}
    >
      <span className="text-sm">
        {following ? "★" : "☆"}
      </span>
      <span>
        {following ? "Following" : "Follow"}
      </span>
    </button>
  );
}