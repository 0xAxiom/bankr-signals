import {
  addSignal,
  updateSignal,
  getSignals,
  getSignalsByProvider,
  getProvider,
  generateSignalId,
} from "@/lib/providers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/signals - Submit a new signal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider,
      action,
      token,
      chain,
      entryPrice,
      leverage,
      confidence,
      reasoning,
      txHash,
      stopLossPct,
      takeProfitPct,
      collateralUsd,
    } = body;

    // Validate required fields
    if (!provider || !action || !token || !entryPrice) {
      return NextResponse.json(
        {
          error: "Required fields: provider, action, token, entryPrice",
          example: {
            provider: "0x123...abc",
            action: "LONG",
            token: "ETH",
            entryPrice: 2650.0,
            chain: "base",
            leverage: 5,
            confidence: 0.85,
            reasoning: "RSI oversold, MACD crossover",
            txHash: "0xabc...def",
            stopLossPct: 5,
            takeProfitPct: 15,
          },
        },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ["BUY", "SELL", "LONG", "SHORT"];
    if (!validActions.includes(action.toUpperCase())) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Check provider is registered
    const registeredProvider = getProvider(provider);
    if (!registeredProvider) {
      return NextResponse.json(
        {
          error: "Provider not registered. Register first at POST /api/providers/register",
          register_example: {
            address: provider,
            name: "your-agent.base.eth",
            description: "My trading agent",
          },
        },
        { status: 403 }
      );
    }

    const timestamp = new Date().toISOString();
    const id = generateSignalId(provider, timestamp);

    const signal = addSignal({
      id,
      provider,
      timestamp,
      action: action.toUpperCase() as "BUY" | "SELL" | "LONG" | "SHORT",
      token: token.toUpperCase(),
      chain: chain || "base",
      entryPrice: parseFloat(entryPrice),
      leverage: leverage ? parseFloat(leverage) : undefined,
      confidence: confidence ? parseFloat(confidence) : undefined,
      reasoning,
      txHash,
      stopLossPct: stopLossPct ? parseFloat(stopLossPct) : undefined,
      takeProfitPct: takeProfitPct ? parseFloat(takeProfitPct) : undefined,
      collateralUsd: collateralUsd ? parseFloat(collateralUsd) : undefined,
      status: "open",
    });

    return NextResponse.json({ signal, status: "published" }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// PATCH /api/signals?id=sig_xxx - Update a signal (close, set exit price)
export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Signal id required as query parameter: ?id=sig_xxx" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, exitPrice, pnlPct } = body;

    const updated = updateSignal(id, {
      ...(status && { status }),
      ...(exitPrice && { exitPrice: parseFloat(exitPrice) }),
      ...(pnlPct !== undefined && { pnlPct: parseFloat(pnlPct) }),
      ...(status === "closed" && { exitTimestamp: new Date().toISOString() }),
    });

    if (!updated) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    return NextResponse.json({ signal: updated });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// GET /api/signals?provider=0x...&token=ETH&limit=50
export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");
  const token = req.nextUrl.searchParams.get("token");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const status = req.nextUrl.searchParams.get("status");

  let signals = provider ? getSignalsByProvider(provider) : getSignals();

  if (token) {
    signals = signals.filter((s) => s.token.toUpperCase() === token.toUpperCase());
  }
  if (status) {
    signals = signals.filter((s) => s.status === status);
  }

  // Sort by timestamp descending
  signals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    signals: signals.slice(0, limit),
    total: signals.length,
  });
}
