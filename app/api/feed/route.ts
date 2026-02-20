import { getSignals, getProviders } from "@/lib/providers";
import { getProviderStats } from "@/lib/signals";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/feed - Combined feed of all signals (API + legacy trade log)
export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const since = req.nextUrl.searchParams.get("since"); // ISO timestamp

  // Get API-submitted signals
  const apiSignals = getSignals().map((s) => ({
    source: "api" as const,
    id: s.id,
    provider: s.provider,
    providerName: getProviders().find(
      (p) => p.address.toLowerCase() === s.provider.toLowerCase()
    )?.name || s.provider.slice(0, 10) + "...",
    timestamp: s.timestamp,
    action: s.action,
    token: s.token,
    entryPrice: s.entryPrice,
    leverage: s.leverage,
    confidence: s.confidence,
    reasoning: s.reasoning,
    txHash: s.txHash,
    status: s.status,
    pnlPct: s.pnlPct,
  }));

  // Get legacy trade-log signals
  const legacyStats = await getProviderStats();
  const legacySignals = legacyStats.flatMap((p) =>
    p.trades.map((t) => ({
      source: "legacy" as const,
      id: `legacy_${t.timestamp}_${t.token}`,
      provider: p.address,
      providerName: p.name,
      timestamp: t.timestamp,
      action: t.action,
      token: t.token,
      entryPrice: t.entryPrice,
      leverage: t.leverage,
      confidence: undefined,
      reasoning: undefined,
      txHash: t.txHash,
      status: t.status,
      pnlPct: t.pnl,
    }))
  );

  // Merge, deduplicate by txHash, sort by time
  const allSignals = [...apiSignals, ...legacySignals];
  const seen = new Set<string>();
  const deduped = allSignals.filter((s) => {
    if (s.txHash) {
      if (seen.has(s.txHash)) return false;
      seen.add(s.txHash);
    }
    return true;
  });

  let filtered = deduped;
  if (since) {
    const sinceTime = new Date(since).getTime();
    filtered = filtered.filter(
      (s) => new Date(s.timestamp).getTime() > sinceTime
    );
  }

  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({
    signals: filtered.slice(0, limit),
    total: filtered.length,
    providers: getProviders().length + legacyStats.length,
  });
}
