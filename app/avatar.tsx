"use client";

import { useState } from "react";
import { getAvatarStyle } from "@/lib/avatar";

interface AvatarProps {
  address: string;
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm", 
  lg: "w-16 h-16 text-lg"
};

export function Avatar({ address, name, avatarUrl, size = "md", className = "" }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // If we have a custom avatar URL and it hasn't errored, show it
  if (avatarUrl && !imageError) {
    const src = avatarUrl.startsWith("/") 
      ? avatarUrl 
      : `/api/avatar?url=${encodeURIComponent(avatarUrl)}`;
      
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full border border-[#2a2a2a] object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }
  
  // Otherwise generate a deterministic avatar
  const style = getAvatarStyle(address, name);
  
  return (
    <div
      className={`${sizeClasses[size]} rounded-full border border-[#2a2a2a] flex items-center justify-center font-mono font-bold ${className}`}
      style={{ backgroundColor: style.backgroundColor, color: style.color }}
    >
      {style.initials}
    </div>
  );
}