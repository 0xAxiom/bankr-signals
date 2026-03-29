import { Metadata } from "next";
import FollowingPageClient from "./FollowingPageClient";

export const metadata: Metadata = {
  title: "Following | Bankr Signals",
  description: "Track your followed providers and their latest trading signals",
};

export const dynamic = "force-dynamic";

export default function FollowingPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Following</h1>
        <p className="text-[#737373] text-sm">
          Track your followed providers and get notified of their latest signals
        </p>
      </div>
      
      <FollowingPageClient />
    </main>
  );
}