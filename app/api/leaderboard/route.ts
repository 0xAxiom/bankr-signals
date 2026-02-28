import { getProviderStats } from "@/lib/signals";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timeFilter = (searchParams.get("period") as "all" | "30d" | "7d" | "1d") || "all";
  
  try {
    const providers = await getProviderStats(timeFilter);
    const sorted = [...providers].sort((a, b) => b.pnl_pct - a.pnl_pct);
    
    return Response.json({ providers: sorted });
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return Response.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}