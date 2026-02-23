import { supabase } from "@/lib/db";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

interface SignalPageProps {
  params: Promise<{ id: string }>;
}

async function getSignal(id: string) {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

async function getProviderName(address: string) {
  const { data } = await supabase
    .from("signal_providers")
    .select("name")
    .ilike("address", address)
    .maybeSingle();
  return data?.name || address.slice(0, 10) + "...";
}

export async function generateMetadata({ params }: SignalPageProps): Promise<Metadata> {
  const { id } = await params;
  const signal = await getSignal(id);
  if (!signal) return { title: "Signal Not Found" };

  const provider = await getProviderName(signal.provider);
  const pnlStr = signal.pnl_pct != null ? `${signal.pnl_pct > 0 ? "+" : ""}${signal.pnl_pct.toFixed(1)}%` : "OPEN";
  const title = `${signal.action} ${signal.token} ${signal.leverage ? signal.leverage + "x" : ""} - ${pnlStr} | ${provider}`;

  const ogParams = new URLSearchParams({
    action: signal.action,
    token: signal.token,
    entry: String(signal.entry_price),
    provider,
    status: signal.status,
    ...(signal.pnl_pct != null && { pnl: String(signal.pnl_pct) }),
    ...(signal.leverage && { leverage: String(signal.leverage) }),
    ...(signal.reasoning && { reasoning: signal.reasoning }),
    ...(signal.tx_hash && { tx: signal.tx_hash }),
  });

  return {
    title,
    description: signal.reasoning || `${signal.action} ${signal.token} by ${provider} on Bankr Signals`,
    openGraph: {
      title,
      description: signal.reasoning || `Verified trading signal on Base`,
      images: [`/api/og/signal?${ogParams.toString()}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: signal.reasoning || `Verified trading signal on Base`,
      images: [`/api/og/signal?${ogParams.toString()}`],
    },
  };
}

export default async function SignalPage({ params }: SignalPageProps) {
  const { id } = await params;
  const signal = await getSignal(id);
  if (!signal) return notFound();

  const provider = await getProviderName(signal.provider);
  const isBuy = signal.action === "BUY" || signal.action === "LONG";
  const hasPnl = signal.pnl_pct != null;
  const pnl = signal.pnl_pct || 0;
  const dollarPnl = hasPnl && signal.collateral_usd ? signal.collateral_usd * (pnl / 100) : null;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Signal header */}
      <div className="flex items-center gap-4 mb-6">
        <span className={`text-sm font-mono font-bold px-3 py-1 rounded ${
          isBuy ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]" : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"
        }`}>
          {signal.action}
        </span>
        <span className="text-3xl font-mono font-bold">{signal.token}</span>
        {signal.leverage && (
          <span className="text-sm text-[#737373] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-1 rounded">
            {signal.leverage}x
          </span>
        )}
      </div>

      {/* PnL */}
      {hasPnl && signal.status === "closed" && (
        <div className={`text-5xl font-mono font-bold mb-2 ${pnl >= 0 ? "text-[rgba(34,197,94,0.8)]" : "text-[rgba(239,68,68,0.8)]"}`}>
          {pnl > 0 ? "+" : ""}{pnl.toFixed(1)}%
        </div>
      )}
      {dollarPnl != null && (
        <div className={`text-lg font-mono mb-6 ${dollarPnl >= 0 ? "text-[rgba(34,197,94,0.5)]" : "text-[rgba(239,68,68,0.5)]"}`}>
          {dollarPnl > 0 ? "+" : ""}${dollarPnl.toFixed(2)}
        </div>
      )}
      {signal.status === "open" && (
        <div className="text-lg font-mono text-[rgba(234,179,8,0.8)] mb-6 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgba(234,179,8,0.6)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[rgba(234,179,8,0.8)]"></span>
          </span>
          OPEN POSITION
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Entry</div>
          <div className="font-mono text-sm">${signal.entry_price?.toLocaleString()}</div>
        </div>
        {signal.exit_price && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
            <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Exit</div>
            <div className="font-mono text-sm">${signal.exit_price?.toLocaleString()}</div>
          </div>
        )}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Size</div>
          <div className="font-mono text-sm">{signal.collateral_usd ? `$${signal.collateral_usd}` : "-"}</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Status</div>
          <div className={`font-mono text-sm ${
            signal.status === "closed" ? "text-[rgba(34,197,94,0.6)]" :
            signal.status === "stopped" ? "text-[rgba(239,68,68,0.6)]" :
            "text-[rgba(234,179,8,0.6)]"
          }`}>{signal.status.toUpperCase()}</div>
        </div>
      </div>

      {/* Reasoning */}
      {signal.reasoning && (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5 mb-8">
          <div className="text-[10px] font-mono text-[rgba(34,197,94,0.6)] uppercase tracking-wider mb-2">Thesis</div>
          <p className="text-sm text-[#b0b0b0] leading-relaxed">{signal.reasoning}</p>
        </div>
      )}

      {/* TX verification */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-8">
        {signal.tx_hash ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[rgba(34,197,94,0.6)] font-mono text-xs font-bold">✓ VERIFIED ON-CHAIN</span>
            <a href={`https://basescan.org/tx/${signal.tx_hash}`} target="_blank" rel="noopener"
              className="text-xs font-mono text-[#737373] hover:text-[rgba(34,197,94,0.6)] transition-colors break-all">
              {signal.tx_hash}
            </a>
          </div>
        ) : (
          <span className="text-xs font-mono text-[#555]">UNVERIFIED - no TX hash</span>
        )}
        {signal.exit_tx_hash && (
          <div className="flex items-center gap-3 flex-wrap mt-2 pt-2 border-t border-[#2a2a2a]">
            <span className="text-[rgba(34,197,94,0.6)] font-mono text-xs font-bold">✓ EXIT TX</span>
            <a href={`https://basescan.org/tx/${signal.exit_tx_hash}`} target="_blank" rel="noopener"
              className="text-xs font-mono text-[#737373] hover:text-[rgba(34,197,94,0.6)] transition-colors break-all">
              {signal.exit_tx_hash}
            </a>
          </div>
        )}
      </div>

      {/* Provider link */}
      <div className="flex items-center justify-between">
        <a href={`/provider/${signal.provider}`} className="text-sm text-[#737373] hover:text-[#e5e5e5] transition-colors">
          by <span className="font-medium text-[#e5e5e5]">{provider}</span>
        </a>
        <div className="text-xs text-[#555]">
          {new Date(signal.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      {/* Share section */}
      <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
        <div className="text-xs text-[#555] mb-2">Share this signal:</div>
        <code className="text-xs font-mono text-[rgba(34,197,94,0.6)] block break-all">
          https://bankrsignals.com/signal/{signal.id}
        </code>
      </div>
    </main>
  );
}
