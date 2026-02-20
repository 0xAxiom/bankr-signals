import {
  getSignals,
  getSignalsByProvider,
  getProvider,
  generateSignalId,
} from "@/lib/providers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Issue #9: Validation helpers
function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function isValidToken(token: string): boolean {
  return /^[A-Za-z0-9]{1,20}$/.test(token);
}

const VALID_ACTIONS = ["BUY", "SELL", "LONG", "SHORT"];

// Issue #2: Wallet signature verification
import { verifySignature } from "@/lib/auth";

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
      message,
      signature,
    } = body;

    // Validate required fields
    if (!provider || !action || !token || !entryPrice) {
      return NextResponse.json(
        { error: "Required fields: provider, action, token, entryPrice" },
        { status: 400 }
      );
    }

    // Issue #9: Validate inputs
    if (!isValidAddress(provider)) {
      return NextResponse.json({ error: "Invalid provider address format" }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(action.toUpperCase())) {
      return NextResponse.json(
        { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isValidToken(token)) {
      return NextResponse.json({ error: "Invalid token format (1-20 alphanumeric chars)" }, { status: 400 });
    }

    const parsedPrice = parseFloat(entryPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: "entryPrice must be a positive number" }, { status: 400 });
    }

    // Issue #2: Require signature verification
    if (!message || !signature) {
      return NextResponse.json(
        { error: "message and signature required. Format: bankr-signals:signal:{provider}:{action}:{token}:{timestamp}" },
        { status: 401 }
      );
    }

    const msgPattern = /^bankr-signals:signal:(0x[a-fA-F0-9]{40}):([A-Z]+):([A-Za-z0-9]+):(\d+)$/;
    const msgMatch = message.match(msgPattern);
    if (!msgMatch) {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    if (msgMatch[1].toLowerCase() !== provider.toLowerCase()) {
      return NextResponse.json({ error: "Provider in message does not match" }, { status: 400 });
    }

    const msgTimestamp = parseInt(msgMatch[4]);
    if (Math.abs(Date.now() - msgTimestamp) > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Message timestamp expired" }, { status: 400 });
    }

    const valid = await verifySignature(provider, message, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Check provider is registered
    const registeredProvider = getProvider(provider);
    if (!registeredProvider) {
      return NextResponse.json(
        { error: "Provider not registered. Register first at POST /api/providers/register" },
        { status: 403 }
      );
    }

    // Issue #9: Validate optional URL fields
    if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: "Invalid txHash format" }, { status: 400 });
    }

    // Issue #3: Writes are read-only in production
    try {
      const { addSignal } = await import("@/lib/providers");
      const timestamp = new Date().toISOString();
      const id = generateSignalId(provider, timestamp);

      const signal = addSignal({
        id,
        provider,
        timestamp,
        action: action.toUpperCase() as "BUY" | "SELL" | "LONG" | "SHORT",
        token: token.toUpperCase(),
        chain: chain || "base",
        entryPrice: parsedPrice,
        leverage: leverage ? parseFloat(leverage) : undefined,
        confidence: confidence ? parseFloat(confidence) : undefined,
        reasoning: typeof reasoning === "string" ? reasoning.slice(0, 1000) : undefined,
        txHash,
        stopLossPct: stopLossPct ? parseFloat(stopLossPct) : undefined,
        takeProfitPct: takeProfitPct ? parseFloat(takeProfitPct) : undefined,
        collateralUsd: collateralUsd ? parseFloat(collateralUsd) : undefined,
        status: "open",
      });

      return NextResponse.json({ signal, status: "published" }, { status: 201 });
    } catch (err: any) {
      if (err?.code === "READ_ONLY") {
        return NextResponse.json(
          { error: "Read-only in production. Submit a PR to data/signals.json to publish signals." },
          { status: 503 }
        );
      }
      throw err;
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// PATCH /api/signals?id=sig_xxx - Update a signal
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
    const { status, exitPrice, pnlPct, provider, message, signature } = body;

    // Issue #2: Require signature for PATCH too
    if (!provider || !message || !signature) {
      return NextResponse.json(
        { error: "provider, message, and signature required for updates" },
        { status: 401 }
      );
    }

    if (!isValidAddress(provider)) {
      return NextResponse.json({ error: "Invalid provider address" }, { status: 400 });
    }

    const valid = await verifySignature(provider, message, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Issue #3: Writes are read-only
    try {
      const { updateSignal } = await import("@/lib/providers");
      const updated = updateSignal(id, {
        ...(status && { status }),
        ...(exitPrice !== undefined && { exitPrice: parseFloat(exitPrice) }),
        ...(pnlPct !== undefined && { pnlPct: parseFloat(pnlPct) }),
        ...(status === "closed" && { exitTimestamp: new Date().toISOString() }),
      });

      if (!updated) {
        return NextResponse.json({ error: "Signal not found" }, { status: 404 });
      }

      return NextResponse.json({ signal: updated });
    } catch (err: any) {
      if (err?.code === "READ_ONLY") {
        return NextResponse.json(
          { error: "Read-only in production." },
          { status: 503 }
        );
      }
      throw err;
    }
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
  const status = req.nextUrl.searchParams.get("status");

  // Issue #18: Cap limit at 200, validate as number
  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const limit = isNaN(rawLimit) ? 50 : Math.min(Math.max(1, rawLimit), 200);

  let signals = provider ? getSignalsByProvider(provider) : getSignals();

  if (token) {
    signals = signals.filter((s) => s.token.toUpperCase() === token.toUpperCase());
  }
  if (status) {
    signals = signals.filter((s) => s.status === status);
  }

  signals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    signals: signals.slice(0, limit),
    total: signals.length,
  });
}
