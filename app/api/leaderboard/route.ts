import { getProviderStats } from "@/lib/signals";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await getProviderStats();
  const sorted = [...providers].sort((a, b) => b.pnl_pct - a.pnl_pct);
  return NextResponse.json({
    providers: sorted.map((p) => ({
      address: p.address,
      name: p.name,
      pnl_pct: p.pnl_pct,
      win_rate: p.win_rate,
      signal_count: p.signal_count,
      subscriber_count: p.subscriber_count,
      avg_return: p.avg_return,
      streak: p.streak,
      last_signal_age: p.last_signal_age,
    })),
  });
}
