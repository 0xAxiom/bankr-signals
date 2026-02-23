import { NextRequest, NextResponse } from "next/server";
import { dbGetSignals, dbGetSignalsByProvider, dbGetProvider, dbAddSignal, supabase } from "@/lib/db";
import { verifySignature } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function isValidToken(token: string): boolean {
  return /^[A-Za-z0-9/]{1,20}$/.test(token);
}

const VALID_ACTIONS = ["BUY", "SELL", "LONG", "SHORT"];

// Fire webhook notifications (async, don't block response)
async function fireWebhooks(signal: any) {
  try {
    // Query active webhooks matching the signal
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("active", true);

    if (!webhooks || webhooks.length === 0) return;

    const matchingWebhooks = webhooks.filter(webhook => {
      // Check provider filter
      if (webhook.provider_filter && 
          webhook.provider_filter.toLowerCase() !== signal.provider.toLowerCase()) {
        return false;
      }
      
      // Check token filter
      if (webhook.token_filter && 
          webhook.token_filter.toLowerCase() !== signal.token.toLowerCase()) {
        return false;
      }
      
      return true;
    });

    // Fire webhooks (fire-and-forget, no await)
    matchingWebhooks.forEach(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BankrSignals-Webhook/1.0'
          },
          body: JSON.stringify({
            type: 'new_signal',
            signal,
            timestamp: new Date().toISOString()
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (response.ok) {
          // Reset failure count on success
          await supabase
            .from("webhooks")
            .update({ 
              last_triggered: new Date().toISOString(),
              failures: 0 
            })
            .eq("id", webhook.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error: any) {
        // Increment failure count, deactivate after 10 failures
        const newFailures = (webhook.failures || 0) + 1;
        const updates: any = { failures: newFailures };
        
        if (newFailures >= 10) {
          updates.active = false;
        }
        
        await supabase
          .from("webhooks")
          .update(updates)
          .eq("id", webhook.id);
      }
    });
  } catch (error: any) {
    // Silently fail - don't interfere with signal creation
    console.error("Webhook firing error:", error);
  }
}

// GET /api/signals - List signals
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    let signals;
    if (provider) {
      signals = await dbGetSignalsByProvider(provider, limit);
    } else {
      signals = await dbGetSignals(limit);
    }

    return NextResponse.json(signals);
  } catch (error: any) {
    console.error("Signals GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/signals - Submit a new signal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider, action, token, chain, entryPrice,
      leverage, confidence, reasoning, txHash,
      stopLossPct, takeProfitPct, collateralUsd,
      message, signature,
    } = body;

    // Validate required fields
    if (!provider || !action || !token || !entryPrice || !txHash) {
      return NextResponse.json(
        { error: "Required fields: provider, action, token, entryPrice, txHash" },
        { status: 400 }
      );
    }

    // Validate txHash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: "txHash must be a valid transaction hash (0x + 64 hex chars)" },
        { status: 400 }
      );
    }

    if (!isValidAddress(provider)) {
      return NextResponse.json({ error: "Invalid provider address" }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(action.toUpperCase())) {
      return NextResponse.json({ error: `action must be one of: ${VALID_ACTIONS.join(", ")}` }, { status: 400 });
    }

    if (!isValidToken(token)) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    const parsedPrice = parseFloat(entryPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: "entryPrice must be a positive number" }, { status: 400 });
    }

    // Require signature
    if (!message || !signature) {
      return NextResponse.json(
        { error: "message and signature required. Format: bankr-signals:signal:{provider}:{action}:{token}:{timestamp}" },
        { status: 401 }
      );
    }

    // Validate message format
    const msgMatch = message.match(/^bankr-signals:signal:(0x[a-fA-F0-9]{40}):(\w+):(\w+):(\d+)$/);
    if (!msgMatch) {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }

    if (msgMatch[1].toLowerCase() !== provider.toLowerCase()) {
      return NextResponse.json({ error: "Provider in message does not match" }, { status: 400 });
    }

    // Check timestamp freshness
    const msgTimestamp = parseInt(msgMatch[4]);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - msgTimestamp) > 300) {
      return NextResponse.json({ error: "Message timestamp expired" }, { status: 400 });
    }

    // Verify signature
    const valid = await verifySignature(provider, message, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Check provider is registered
    const providerRecord = await dbGetProvider(provider);
    if (!providerRecord) {
      return NextResponse.json({ error: "Provider not registered. POST /api/providers/register first." }, { status: 403 });
    }

    // Generate signal ID
    const id = `sig_${Buffer.from(`${provider}:${Date.now()}:${Math.random()}`).toString("base64url").slice(0, 12)}`;

    const signal = await dbAddSignal({
      id, provider, action: action.toUpperCase(), token, chain: chain || "base",
      entryPrice: parsedPrice, leverage, confidence, reasoning, txHash,
      stopLossPct, takeProfitPct, collateralUsd,
    });

    // Fire webhooks (async, don't block response)
    fireWebhooks(signal);

    return NextResponse.json({ success: true, signal }, { status: 201 });
  } catch (error: any) {
    console.error("Signal POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
