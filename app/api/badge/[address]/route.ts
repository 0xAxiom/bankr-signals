import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const runtime = "edge";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSVG({
  name,
  winRate,
  pnl,
  signals,
  rank,
}: {
  name: string;
  winRate: number;
  pnl: number;
  signals: number;
  rank: number | null;
}) {
  const pnlColor = pnl >= 0 ? "#22c55e" : "#ef4444";
  const pnlSign = pnl >= 0 ? "+" : "";
  const winColor = winRate >= 60 ? "#22c55e" : winRate >= 40 ? "#f59e0b" : "#ef4444";
  const rankText = rank ? `#${rank}` : "—";

  const safeName = esc(name.length > 18 ? name.slice(0, 17) + "…" : name);

  return `<svg width="320" height="88" viewBox="0 0 320 88" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="88" rx="10" fill="#0a0a0a"/>
  <rect width="320" height="88" rx="10" fill="url(#border)" fill-opacity="1"/>
  <rect x="0.5" y="0.5" width="319" height="87" rx="9.5" stroke="#2a2a2a"/>

  <!-- Header row -->
  <text x="14" y="22" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10" fill="#555555" letter-spacing="0.08em">BANKR SIGNALS</text>
  <text x="306" y="22" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10" fill="#22c55e" text-anchor="end">✓ VERIFIED</text>

  <!-- Provider name -->
  <text x="14" y="44" font-family="ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="18" font-weight="600" fill="#e5e5e5">${safeName}</text>

  <!-- Rank pill -->
  <rect x="228" y="30" width="78" height="18" rx="4" fill="#1a1a1a" stroke="#2a2a2a"/>
  <text x="267" y="43" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="#737373" text-anchor="middle">Rank ${esc(rankText)}</text>

  <!-- Divider -->
  <line x1="14" y1="55" x2="306" y2="55" stroke="#1e1e1e"/>

  <!-- Stats row -->
  <!-- Win Rate -->
  <text x="14" y="70" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10" fill="#555555">WIN RATE</text>
  <text x="14" y="82" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="13" font-weight="700" fill="${winColor}">${winRate.toFixed(0)}%</text>

  <!-- PnL -->
  <text x="110" y="70" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10" fill="#555555">AVG PnL</text>
  <text x="110" y="82" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="13" font-weight="700" fill="${pnlColor}">${pnlSign}${pnl.toFixed(1)}%</text>

  <!-- Signals -->
  <text x="208" y="70" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10" fill="#555555">SIGNALS</text>
  <text x="208" y="82" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="13" font-weight="700" fill="#e5e5e5">${signals}</text>

  <defs>
    <linearGradient id="border" x1="0" y1="0" x2="320" y2="88" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1a1a1a"/>
      <stop offset="1" stop-color="#0f0f0f"/>
    </linearGradient>
  </defs>
</svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  try {
    // Fetch provider
    const { data: provider } = await supabase
      .from("signal_providers")
      .select("name, address")
      .ilike("address", address)
      .maybeSingle();

    if (!provider) {
      return new NextResponse(
        buildSVG({ name: "Unknown Provider", winRate: 0, pnl: 0, signals: 0, rank: null }),
        { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "s-maxage=300" } }
      );
    }

    // Fetch closed signals for this provider
    const { data: signals } = await supabase
      .from("signals")
      .select("pnl_pct, status")
      .ilike("provider", address);

    const allSignals = signals || [];
    const closed = allSignals.filter((s) => s.status === "closed" && s.pnl_pct != null);
    const wins = closed.filter((s) => s.pnl_pct > 0).length;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    const avgPnl =
      closed.length > 0
        ? closed.reduce((sum, s) => sum + s.pnl_pct, 0) / closed.length
        : 0;

    // Get rank (by win rate among providers with closed signals)
    let rank: number | null = null;
    if (closed.length > 0) {
      const { data: allProviders } = await supabase
        .from("signal_providers")
        .select("address");

      if (allProviders && allProviders.length > 0) {
        // Count providers with better win rates (simplified ranking)
        const { count } = await supabase
          .from("signals")
          .select("provider", { count: "exact", head: true })
          .eq("status", "closed")
          .gt("pnl_pct", 0);
        rank = 1; // Simplified — just show rank 1 if they have wins
      }
    }

    // Better rank calculation: use all providers' stats
    const { data: allSignalData } = await supabase
      .from("signals")
      .select("provider, pnl_pct, status")
      .eq("status", "closed")
      .not("pnl_pct", "is", null);

    if (allSignalData && allSignalData.length > 0) {
      // Group by provider
      const providerMap = new Map<string, { wins: number; total: number }>();
      for (const s of allSignalData) {
        const p = s.provider.toLowerCase();
        const cur = providerMap.get(p) || { wins: 0, total: 0 };
        cur.total++;
        if (s.pnl_pct > 0) cur.wins++;
        providerMap.set(p, cur);
      }
      const myWinRate =
        (providerMap.get(address.toLowerCase())?.wins || 0) /
        Math.max(providerMap.get(address.toLowerCase())?.total || 1, 1);
      const betterCount = [...providerMap.values()].filter(
        (v) => v.total > 0 && v.wins / v.total > myWinRate
      ).length;
      rank = betterCount + 1;
    }

    const svg = buildSVG({
      name: provider.name,
      winRate,
      pnl: avgPnl,
      signals: allSignals.length,
      rank,
    });

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Badge error:", err);
    return new NextResponse(
      buildSVG({ name: "Error", winRate: 0, pnl: 0, signals: 0, rank: null }),
      { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" } }
    );
  }
}
