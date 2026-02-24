import { supabase } from "@/lib/db";
import { notFound } from "next/navigation";
import { getCurrentPrice } from "@/lib/onchain-price";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmbedSignal({ params }: Props) {
  const { id } = await params;
  const { data: signal } = await supabase
    .from("signals")
    .select("*")
    .eq("id", id)
    .single();
  if (!signal) return notFound();

  const { data: prov } = await supabase
    .from("signal_providers")
    .select("name")
    .ilike("address", signal.provider)
    .maybeSingle();
  const provider = prov?.name || signal.provider.slice(0, 10) + "...";

  const isBuy = signal.action === "BUY" || signal.action === "LONG";

  // Live PnL
  let pnl = signal.pnl_pct;
  if (pnl == null && signal.status === "open" && signal.token_address && signal.entry_price > 0) {
    const price = await getCurrentPrice(signal.token_address);
    if (price && price > 0) {
      pnl = ((price - signal.entry_price) / signal.entry_price) * 100;
      if (signal.action === "SHORT") pnl = -pnl;
    }
  }

  const hasPnl = pnl != null;
  const pnlVal = pnl ?? 0;

  function formatEntry(p: number): string {
    if (p >= 1) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 0.01) return `$${p.toFixed(4)}`;
    if (p > 0) {
      const s = p.toFixed(20).split(".")[1] || "";
      let lz = 0;
      for (const c of s) { if (c === "0") lz++; else break; }
      return `$${p.toFixed(lz + 4).replace(/0+$/, "")}`;
    }
    return "$0";
  }

  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <a
          href={`https://bankrsignals.com/signal/${id}`}
          target="_blank"
          rel="noopener"
          style={{
            display: "block",
            textDecoration: "none",
            color: "#e5e5e5",
            padding: "20px 24px",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
            background: "#0a0a0a",
            maxWidth: "400px",
          }}
        >
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "4px",
                background: isBuy ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                color: isBuy ? "#22c55e" : "#ef4444",
                border: `1px solid ${isBuy ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                letterSpacing: "0.05em",
              }}
            >
              {signal.action}
            </span>
            <span style={{ fontSize: "24px", fontWeight: 700 }}>{signal.token}</span>
            {signal.leverage && (
              <span style={{ fontSize: "12px", color: "#737373", background: "#151515", border: "1px solid #2a2a2a", padding: "2px 8px", borderRadius: "4px" }}>
                {signal.leverage}x
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: "10px", color: signal.tx_hash ? "#22c55e" : "#555" }}>
              {signal.tx_hash ? "✓" : "○"}
            </span>
          </div>

          {/* PnL or status */}
          {hasPnl ? (
            <div style={{ fontSize: "36px", fontWeight: 700, color: pnlVal >= 0 ? "#22c55e" : "#ef4444", lineHeight: 1, marginBottom: "12px" }}>
              {pnlVal > 0 ? "+" : ""}{pnlVal.toFixed(1)}%
              {signal.status === "open" && (
                <span style={{ fontSize: "11px", color: "rgba(234,179,8,0.6)", marginLeft: "8px", verticalAlign: "middle" }}>LIVE</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "14px", color: "#eab308", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#eab308", display: "inline-block" }} />
              OPEN
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: "20px", fontSize: "12px", marginBottom: "12px" }}>
            <div>
              <div style={{ color: "#555", fontSize: "9px", letterSpacing: "0.1em", marginBottom: "2px" }}>ENTRY</div>
              <div style={{ fontWeight: 600 }}>{formatEntry(signal.entry_price)}</div>
            </div>
            {signal.collateral_usd && (
              <div>
                <div style={{ color: "#555", fontSize: "9px", letterSpacing: "0.1em", marginBottom: "2px" }}>SIZE</div>
                <div style={{ fontWeight: 600 }}>${signal.collateral_usd}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #1e1e1e", paddingTop: "10px", fontSize: "11px" }}>
            <span style={{ color: "#737373" }}>by <span style={{ color: "#e5e5e5", fontWeight: 600 }}>{provider}</span></span>
            <span style={{ color: "#444" }}>bankrsignals.com</span>
          </div>
        </a>
      </body>
    </html>
  );
}
