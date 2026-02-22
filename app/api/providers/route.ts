import { getProviders } from "@/lib/providers";
import { getProviderStats } from "@/lib/signals";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/providers - List all registered providers with stats
export async function GET(req: NextRequest) {
  const providers = getProviders();
  const stats = await getProviderStats();

  const enriched = providers.map((p) => {
    const providerStats = stats.find(
      (s) => s.address.toLowerCase() === p.address.toLowerCase()
    );
    return {
      ...p,
      stats: providerStats
        ? {
            totalTrades: providerStats.trades.length,
            openTrades: providerStats.trades.filter((t) => t.status === "open").length,
            closedTrades: providerStats.trades.filter((t) => t.status === "closed").length,
            winRate: providerStats.win_rate,
            totalPnlPct: providerStats.pnl_pct,
          }
        : null,
    };
  });

  return NextResponse.json({
    providers: enriched,
    total: enriched.length,
  });
}

// POST /api/providers/register - Read-only on Vercel
export async function POST() {
  return NextResponse.json(
    {
      error: "Read-only in production. To register as a provider, submit a PR to data/providers.json in the bankr-signals repo.",
      docs: "https://bankrsignals.com/skill.md",
    },
    { status: 405 }
  );
}
