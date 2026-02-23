import { supabase } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const since = req.nextUrl.searchParams.get("since");

  let query = supabase
    .from("signals")
    .select("*, signal_providers!inner(name)")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gt("timestamp", since);
  }

  const { data: signals, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count } = await supabase
    .from("signal_providers")
    .select("*", { count: "exact", head: true });

  const formatted = (signals || []).map((s: any) => ({
    source: "api",
    id: s.id,
    provider: s.provider,
    providerName: s.signal_providers?.name || s.provider.slice(0, 10) + "...",
    timestamp: s.timestamp,
    action: s.action,
    token: s.token,
    entryPrice: s.entry_price,
    leverage: s.leverage,
    confidence: s.confidence,
    reasoning: s.reasoning,
    txHash: s.tx_hash,
    exitTxHash: s.exit_tx_hash,
    collateralUsd: s.collateral_usd,
    status: s.status,
    pnlPct: s.pnl_pct,
  }));

  return NextResponse.json({
    signals: formatted,
    total: formatted.length,
    providers: count || 0,
  });
}
