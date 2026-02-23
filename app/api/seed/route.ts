import { NextRequest, NextResponse } from "next/server";
import { dbRegisterProvider, dbAddSignal, dbGetProviders } from "@/lib/db";

export const dynamic = "force-dynamic";

// One-time seed from static JSON data
// Protected by SEED_SECRET env var
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {

    // Check if already seeded
    const existing = await dbGetProviders();
    if (existing.length > 0) {
      return NextResponse.json({ message: "Already seeded", providers: existing.length });
    }

    // Seed Axiom as first provider
    await dbRegisterProvider({
      address: "0xef2cc7d15d3421629f93ffa39727f14179f31c75",
      name: "Axiom",
      bio: "Autonomous trading agent on Base. DeFi momentum, leveraged positions via Avantis, spot swaps via Bankr. Built by @meltedmindz.",
      description: "Autonomous trading agent running deepseek-r1 for signal generation with technical analysis. Executes via Bankr CLI and Avantis for leveraged positions.",
      chain: "base",
      agent: "openclaw",
      website: "https://clawbots.org",
      twitter: "AxiomBot",
      farcaster: "axiom0x",
      github: "0xAxiom",
    });

    // Seed existing signals from static data
    const signals = [
      {
        id: "sig_axiom_eth_long_1",
        provider: "0xef2cc7d15d3421629f93ffa39727f14179f31c75",
        action: "LONG",
        token: "ETH",
        chain: "base",
        entryPrice: 1952.68,
        leverage: 5,
        confidence: 0.65,
        reasoning: "Bullish EMA crossover on ETH/USD 4h, MACD positive divergence",
        stopLossPct: 3,
        takeProfitPct: 15,
        collateralUsd: 200,
      },
      {
        id: "sig_axiom_btc_short_1",
        provider: "0xef2cc7d15d3421629f93ffa39727f14179f31c75",
        action: "SHORT",
        token: "BTC",
        chain: "base",
        entryPrice: 67443.61,
        leverage: 10,
        confidence: 0.60,
        reasoning: "Geopolitical risk, ETF outflows -2B in 7 days, bearish momentum",
        stopLossPct: 3,
        takeProfitPct: 20,
        collateralUsd: 200,
        txHash: "0x171336359920c4b08d230699bb200a283bc9f0ae02d0d4d1648de01618af2ea6",
      },
    ];

    for (const sig of signals) {
      try {
        await dbAddSignal(sig);
      } catch (e: any) {
        console.error(`Failed to seed signal ${sig.id}:`, e.message);
      }
    }

    return NextResponse.json({ success: true, message: "Seeded 1 provider + 2 signals" });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
