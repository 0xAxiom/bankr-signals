'use client';

import Link from 'next/link';
import { useFollows } from '@/hooks/useFollows';

export function FollowingNavLink() {
  const { followCount, isLoaded } = useFollows();

  if (!isLoaded) {
    return (
      <Link href="/following" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">
        ❤️ Following
      </Link>
    );
  }

  return (
    <Link 
      href="/following" 
      className="text-[#737373] hover:text-[#e5e5e5] transition-colors relative flex items-center gap-1"
    >
      ❤️ Following
      {followCount > 0 && (
        <span className="bg-pink-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center font-medium">
          {followCount}
        </span>
      )}
    </Link>
  );
}