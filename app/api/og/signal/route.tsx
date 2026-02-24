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
    const size = sp.get("size") || "";

    const isLong = action === "BUY" || action === "LONG";
    const hasPnl = pnl !== "" && status === "closed";
    const pnlNum = hasPnl ? parseFloat(pnl) : 0;

    const actionColor = isLong ? "#22c55e" : "#ef4444";
    const actionBg = isLong ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
    const pnlColor = pnlNum >= 0 ? "#22c55e" : "#ef4444";

    // Format entry price for micro prices
    const entryNum = parseFloat(entry);
    let entryStr = "$0";
    if (entryNum >= 1) entryStr = `$${entryNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    else if (entryNum >= 0.01) entryStr = `$${entryNum.toFixed(4)}`;
    else if (entryNum > 0) {
      const s = entryNum.toFixed(20);
      const dec = s.split(".")[1] || "";
      let lz = 0;
      for (const c of dec) { if (c === "0") lz++; else break; }
      entryStr = `$${entryNum.toFixed(lz + 4).replace(/0+$/, "")}`;
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#0a0a0a",
            color: "#e5e5e5",
            fontFamily: "system-ui, -apple-system, sans-serif",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle grid background */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Accent line top */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              display: "flex",
              background: isLong
                ? "linear-gradient(90deg, #22c55e, rgba(34,197,94,0.1))"
                : "linear-gradient(90deg, #ef4444, rgba(239,68,68,0.1))",
            }}
          />

          {/* Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "48px 60px",
              flex: 1,
              position: "relative",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "36px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: actionColor,
                    display: "flex",
                  }}
                />
                <div
                  style={{
                    fontSize: "16px",
                    color: "#555",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    display: "flex",
                  }}
                >
                  BANKR SIGNALS
                </div>
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: tx ? "#22c55e" : "#555",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: tx ? "rgba(34,197,94,0.08)" : "transparent",
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: tx ? "1px solid rgba(34,197,94,0.15)" : "1px solid transparent",
                }}
              >
                {tx ? "✓ VERIFIED" : "○ UNVERIFIED"}
              </div>
            </div>

            {/* Main signal info */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "20px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  padding: "6px 18px",
                  borderRadius: "6px",
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  background: actionBg,
                  color: actionColor,
                  border: `1px solid ${isLong ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  display: "flex",
                }}
              >
                {action}
              </div>
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  display: "flex",
                }}
              >
                {token}
              </div>
              {leverage && (
                <div
                  style={{
                    fontSize: "24px",
                    color: "#737373",
                    background: "#151515",
                    border: "1px solid #2a2a2a",
                    padding: "4px 14px",
                    borderRadius: "6px",
                    display: "flex",
                  }}
                >
                  {leverage}x
                </div>
              )}
            </div>

            {/* PnL or Status */}
            {hasPnl ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "16px",
                  marginBottom: "28px",
                }}
              >
                <div
                  style={{
                    fontSize: "80px",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: pnlColor,
                    display: "flex",
                    lineHeight: 1,
                  }}
                >
                  {pnlNum >= 0 ? "+" : ""}
                  {pnlNum.toFixed(1)}%
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    color: "#555",
                    textTransform: "uppercase" as const,
                    display: "flex",
                  }}
                >
                  CLOSED
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "28px",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#eab308",
                    display: "flex",
                  }}
                />
                <div
                  style={{
                    fontSize: "28px",
                    color: "#eab308",
                    fontWeight: 600,
                    display: "flex",
                  }}
                >
                  OPEN POSITION
                </div>
              </div>
            )}

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: "32px",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    letterSpacing: "0.1em",
                    marginBottom: "4px",
                    display: "flex",
                  }}
                >
                  ENTRY
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    display: "flex",
                  }}
                >
                  {entryStr}
                </div>
              </div>
              {size && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      letterSpacing: "0.1em",
                      marginBottom: "4px",
                      display: "flex",
                    }}
                  >
                    SIZE
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: 600,
                      display: "flex",
                    }}
                  >
                    ${size}
                  </div>
                </div>
              )}
            </div>

            {/* Reasoning */}
            {reasoning && (
              <div
                style={{
                  background: "#111",
                  border: "1px solid #1e1e1e",
                  borderRadius: "10px",
                  padding: "18px 22px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "140px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: actionColor,
                    letterSpacing: "0.12em",
                    marginBottom: "8px",
                    display: "flex",
                  }}
                >
                  THESIS
                </div>
                <div
                  style={{
                    fontSize: "17px",
                    color: "#999",
                    lineHeight: 1.5,
                    display: "flex",
                  }}
                >
                  {reasoning.length > 160
                    ? reasoning.slice(0, 160) + "..."
                    : reasoning}
                </div>
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "20px",
                borderTop: "1px solid #1e1e1e",
                marginTop: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    fontSize: "15px",
                    color: "#737373",
                    display: "flex",
                  }}
                >
                  by
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    color: "#e5e5e5",
                    fontWeight: 600,
                    display: "flex",
                  }}
                >
                  {provider}
                </div>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#444",
                  display: "flex",
                }}
              >
                bankrsignals.com
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("OG signal error:", msg);
    return new Response(`Error: ${msg}`, { status: 500 });
  }
}
