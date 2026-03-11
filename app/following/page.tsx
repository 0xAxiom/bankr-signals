import { Metadata } from "next";
import FollowingFeed from "./FollowingFeed";

export const metadata: Metadata = {
  title: "Following - Bankr Signals",
  description: "Your personalized feed of signals from providers you follow",
};

export default function FollowingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-24">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Following</h1>
          <p className="text-zinc-400">
            Your personalized feed of signals from providers you follow
          </p>
        </div>

        <FollowingFeed />
      </div>
    </div>
  );
}