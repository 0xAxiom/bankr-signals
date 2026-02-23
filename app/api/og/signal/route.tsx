import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") || "LONG";
  const token = sp.get("token") || "ETH";
  const entry = sp.get("entry") || "0";
  const pnl = sp.get("pnl") || "";
  const leverage = sp.get("leverage") || "";
  const provider = sp.get("provider") || "Unknown";
  const reasoning = sp.get("reasoning") || "";
  const status = sp.get("status") || "open";
  const tx = sp.get("tx") || "";

  const isLong = action === "BUY" || action === "LONG";
  const hasPnl = pnl !== "" && status === "closed";
  const pnlNum = hasPnl ? parseFloat(pnl) : 0;

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: "#0a0a0a", padding: "48px 60px", color: "#e5e5e5",
        fontFamily: "sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "20px" }}>📊</div>
            <div style={{ fontSize: "18px", color: "#737373" }}>bankr signals</div>
          </div>
          <div style={{ fontSize: "14px", color: "#555" }}>bankrsignals.com</div>
        </div>

        {/* Action + Token */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{
            padding: "8px 20px", borderRadius: "8px", fontSize: "28px", fontWeight: 700,
            background: isLong ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: isLong ? "rgb(34,197,94)" : "rgb(239,68,68)",
          }}>{action}</div>
          <div style={{ fontSize: "52px", fontWeight: 700 }}>{token}</div>
          {leverage && <div style={{ fontSize: "22px", color: "#737373", background: "#1a1a1a", padding: "6px 14px", borderRadius: "6px" }}>{leverage}x</div>}
          <div style={{ fontSize: "26px", color: "#737373", marginLeft: "8px" }}>@ ${parseFloat(entry).toLocaleString()}</div>
        </div>

        {/* PnL or Status */}
        {hasPnl ? (
          <div style={{
            fontSize: "72px", fontWeight: 700, marginBottom: "20px",
            color: pnlNum >= 0 ? "rgb(34,197,94)" : "rgb(239,68,68)",
          }}>
            {pnlNum >= 0 ? "+" : ""}{pnlNum.toFixed(1)}%
          </div>
        ) : (
          <div style={{ fontSize: "32px", color: "rgb(234,179,8)", marginBottom: "20px" }}>
            ● OPEN POSITION
          </div>
        )}

        {/* Reasoning */}
        {reasoning && (
          <div style={{
            background: "#111", border: "1px solid #2a2a2a", borderRadius: "12px",
            padding: "16px 20px", marginBottom: "20px", flex: 1, display: "flex", flexDirection: "column",
          }}>
            <div style={{ fontSize: "11px", color: "rgb(34,197,94)", letterSpacing: "1px", marginBottom: "8px" }}>THESIS</div>
            <div style={{ fontSize: "18px", color: "#b0b0b0", lineHeight: "1.5" }}>
              {reasoning.length > 180 ? reasoning.slice(0, 180) + "..." : reasoning}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: "20px", borderTop: "1px solid #2a2a2a", marginTop: "auto",
        }}>
          <div style={{ fontSize: "16px", color: "#737373" }}>by {provider}</div>
          {tx ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ color: "rgb(34,197,94)", fontSize: "14px" }}>✓ VERIFIED</div>
              <div style={{ fontSize: "12px", color: "#555" }}>{tx.slice(0, 10)}...{tx.slice(-6)}</div>
            </div>
          ) : (
            <div style={{ fontSize: "14px", color: "#555" }}>unverified</div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
