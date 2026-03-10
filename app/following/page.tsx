import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Following - Bankr Signals",
  description: "See the latest signals from traders you follow. Personalized feed of verified trading signals.",
};

import FollowingClient from './FollowingClient';

export default function FollowingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#e5e5e5] mb-2">Following</h1>
            <p className="text-sm text-[#737373]">
              Signals from traders you follow. Follow more providers to personalize your feed.
            </p>
          </div>
          <a 
            href="/leaderboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Discover Traders
          </a>
        </div>
      </div>

      <FollowingClient />
    </main>
  );
}