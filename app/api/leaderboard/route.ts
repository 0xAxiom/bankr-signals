import { NextResponse } from "next/server";
import { dbGetLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leaderboard = await dbGetLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
