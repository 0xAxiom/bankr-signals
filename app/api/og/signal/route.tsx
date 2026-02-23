import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
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

    const actionColor = isLong ? "#22c55e" : "#ef4444";
    const actionBg = isLong ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";
    const pnlColor = pnlNum >= 0 ? "#22c55e" : "#ef4444";

    return new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          background: "#0a0a0a", padding: "48px 60px", color: "#e5e5e5",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
            <div style={{ fontSize: "18px", color: "#737373", display: "flex" }}>bankr signals</div>
            <div style={{ fontSize: "14px", color: "#555", display: "flex" }}>bankrsignals.com</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <div style={{
              padding: "8px 20px", borderRadius: "8px", fontSize: "28px", fontWeight: 700,
              background: actionBg, color: actionColor, display: "flex",
            }}>{action}</div>
            <div style={{ fontSize: "52px", fontWeight: 700, display: "flex" }}>{token}</div>
            {leverage ? <div style={{ fontSize: "22px", color: "#737373", background: "#1a1a1a", padding: "6px 14px", borderRadius: "6px", display: "flex" }}>{leverage}x</div> : null}
          </div>

          {hasPnl ? (
            <div style={{ fontSize: "72px", fontWeight: 700, marginBottom: "20px", color: pnlColor, display: "flex" }}>
              {pnlNum >= 0 ? "+" : ""}{pnlNum.toFixed(1)}%
            </div>
          ) : (
            <div style={{ fontSize: "32px", color: "#eab308", marginBottom: "20px", display: "flex" }}>
              OPEN POSITION
            </div>
          )}

          <div style={{ display: "flex", gap: "24px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "12px", color: "#555", display: "flex" }}>ENTRY</div>
              <div style={{ fontSize: "24px", display: "flex" }}>${parseFloat(entry).toLocaleString()}</div>
            </div>
          </div>

          {reasoning ? (
            <div style={{
              background: "#111", border: "1px solid #2a2a2a", borderRadius: "12px",
              padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column",
            }}>
              <div style={{ fontSize: "11px", color: "#22c55e", marginBottom: "8px", display: "flex" }}>THESIS</div>
              <div style={{ fontSize: "18px", color: "#b0b0b0", display: "flex" }}>
                {reasoning.length > 180 ? reasoning.slice(0, 180) + "..." : reasoning}
              </div>
            </div>
          ) : null}

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: "20px", borderTop: "1px solid #2a2a2a", marginTop: "auto",
          }}>
            <div style={{ fontSize: "16px", color: "#737373", display: "flex" }}>by {provider}</div>
            <div style={{ fontSize: "14px", color: tx ? "#22c55e" : "#555", display: "flex" }}>
              {tx ? "✓ VERIFIED" : "unverified"}
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e: any) {
    console.error("OG signal error:", e);
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}
