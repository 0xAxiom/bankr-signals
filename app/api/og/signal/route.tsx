import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action") || "LONG";
  const token = searchParams.get("token") || "ETH";
  const entry = searchParams.get("entry") || "0";
  const pnl = searchParams.get("pnl");
  const leverage = searchParams.get("leverage");
  const provider = searchParams.get("provider") || "Unknown";
  const reasoning = searchParams.get("reasoning") || "";
  const status = searchParams.get("status") || "open";
  const txHash = searchParams.get("tx");

  const isLong = action === "BUY" || action === "LONG";
  const hasPnl = pnl !== null && pnl !== "";
  const pnlNum = hasPnl ? parseFloat(pnl!) : 0;
  const isProfit = pnlNum >= 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          padding: "48px 60px",
          fontFamily: "system-ui, sans-serif",
          color: "#e5e5e5",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "#111",
                border: "1px solid rgba(34,197,94,0.4)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              📊
            </div>
            <span style={{ fontSize: 18, color: "#737373" }}>bankr signals</span>
          </div>
          <span style={{ fontSize: 14, color: "#555", fontFamily: "monospace" }}>bankrsignals.com</span>
        </div>

        {/* Main signal */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 24,
              fontWeight: 700,
              fontFamily: "monospace",
              background: isLong ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: isLong ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)",
            }}
          >
            {action}
          </div>
          <span style={{ fontSize: 48, fontWeight: 700, fontFamily: "monospace" }}>{token}</span>
          {leverage && (
            <span
              style={{
                fontSize: 20,
                color: "#737373",
                background: "#1a1a1a",
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #2a2a2a",
              }}
            >
              {leverage}x
            </span>
          )}
          <span style={{ fontSize: 24, color: "#737373", marginLeft: 8 }}>@</span>
          <span style={{ fontSize: 28, fontFamily: "monospace" }}>${parseFloat(entry).toLocaleString()}</span>
        </div>

        {/* PnL */}
        {hasPnl && status === "closed" && (
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              fontFamily: "monospace",
              color: isProfit ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)",
              marginBottom: 16,
            }}
          >
            {isProfit ? "+" : ""}
            {pnlNum.toFixed(1)}%
          </div>
        )}

        {status === "open" && (
          <div
            style={{
              fontSize: 28,
              fontFamily: "monospace",
              color: "rgba(234,179,8,0.8)",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ● OPEN POSITION
          </div>
        )}

        {/* Reasoning */}
        {reasoning && (
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 24,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: 11, color: "rgba(34,197,94,0.6)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>
              THESIS
            </span>
            <span style={{ fontSize: 18, color: "#b0b0b0", lineHeight: 1.5 }}>
              {reasoning.slice(0, 200)}{reasoning.length > 200 ? "..." : ""}
            </span>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 20,
            borderTop: "1px solid #2a2a2a",
            marginTop: "auto",
          }}
        >
          <span style={{ fontSize: 16, color: "#737373" }}>by {provider}</span>
          {txHash && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "rgba(34,197,94,0.7)", fontSize: 14 }}>✓ VERIFIED</span>
              <span style={{ fontSize: 12, color: "#555", fontFamily: "monospace" }}>
                {txHash.slice(0, 10)}...{txHash.slice(-6)}
              </span>
            </div>
          )}
          {!txHash && <span style={{ fontSize: 14, color: "#555" }}>unverified</span>}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
