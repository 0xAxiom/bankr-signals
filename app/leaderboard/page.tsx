import { getProviderStats } from "@/lib/signals";
import LeaderboardClient from "./LeaderboardClient";

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  // Get initial "all time" data for SSR
  const providers = await getProviderStats("all");
  const sorted = [...providers].sort((a, b) => b.pnl_pct - a.pnl_pct);

  return <LeaderboardClient initialData={sorted} />;
}
