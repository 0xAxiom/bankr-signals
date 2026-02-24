import { NextRequest, NextResponse } from "next/server";
import { dbGetSignal, dbCloseSignal, supabase } from "@/lib/db";
import { verifySignature } from "@/lib/auth";
import { 
  checkRateLimit, 
  rateLimitResponse, 
  getClientIP, 
  RATE_LIMITS, 
  detectAbuse 
} from "@/lib/ratelimit";
import {
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
  ValidationPatterns,
  CustomValidators,
  APIErrorCode,
  dbToApiSignal,
  validateRequestSize,
} from "@/lib/api-utils";
import { SignalStatus } from "@/lib/types";
import { getTokenPrice, calculateUnrealizedPnl } from "@/lib/prices";

export const dynamic = "force-dynamic";

// POST /api/signals/close - Close an open signal position with enhanced validation
export async function POST(req: NextRequest) {
  try {
    // Request size validation
    const sizeError = validateRequestSize(req, 10 * 1024); // 10KB max
    if (sizeError) {
      return createErrorResponse(sizeError.code, sizeError.message, 413);
    }

    const body = await req.json();
    
    // Enhanced validation
    const validationError = validateRequest(body, [
      { field: "signalId", required: true, type: "string", minLength: 5 },
      { field: "exitPrice", required: true, type: "number", custom: CustomValidators.positiveNumber },
      { field: "exitTxHash", required: true, type: "string", custom: CustomValidators.txHash },
      { field: "message", required: true, type: "string", minLength: 10 },
      { field: "signature", required: true, type: "string", pattern: /^0x[a-fA-F0-9]{130}$/ },
      
      // Optional fields with validation
      { field: "pnlPct", type: "number" },
      { field: "pnlUsd", type: "number" },
      { field: "reason", type: "string", maxLength: 100 },
      { field: "feesUsd", type: "number", min: 0 },
      { field: "slippagePct", type: "number", min: 0, max: 10 },
    ]);

    if (validationError) {
      return createErrorResponse(validationError.code, validationError.message, 400, {}, validationError.field);
    }

    const { signalId, exitPrice, exitTxHash, pnlPct, pnlUsd, message, signature, reason, feesUsd, slippagePct } = body;

    // Get the signal
    const signal = await dbGetSignal(signalId);
    if (!signal) {
      return createErrorResponse(
        APIErrorCode.NOT_FOUND,
        "Signal not found",
        404
      );
    }

    if (signal.status !== SignalStatus.OPEN) {
      return createErrorResponse(
        APIErrorCode.BUSINESS_LOGIC_ERROR,
        `Signal is not open (current status: ${signal.status})`,
        400,
        { currentStatus: signal.status }
      );
    }

    // Rate limiting per provider
    const providerLimit = checkRateLimit(`close:${signal.provider}`, RATE_LIMITS.SIGNAL_CLOSE);
    if (!providerLimit.allowed) {
      return rateLimitResponse(providerLimit, "Signal closing rate limit exceeded for this provider");
    }

    // Enhanced message format validation
    const msgMatch = message.match(/^bankr-signals:close:(sig_\w+):(\d+\.\d+):(\d+)$/);
    if (!msgMatch) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Invalid message format. Expected: bankr-signals:close:{signalId}:{exitPrice}:{timestamp}",
        400
      );
    }

    if (msgMatch[1] !== signalId) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Signal ID in message does not match request",
        400
      );
    }

    const msgExitPrice = parseFloat(msgMatch[2]);
    if (Math.abs(msgExitPrice - exitPrice) > exitPrice * 0.001) { // 0.1% tolerance
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Exit price in message does not match request",
        400
      );
    }

    // Check timestamp freshness (5 min window)
    const msgTimestamp = parseInt(msgMatch[3]);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - msgTimestamp) > 300) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Message timestamp expired (5 minute window)",
        400
      );
    }

    // Verify signature (must be from signal provider)
    const valid = await verifySignature(signal.provider, message, signature);
    if (!valid) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Invalid signature - must be signed by signal provider",
        401
      );
    }

    // Abuse detection
    const abuseCheck = detectAbuse(signal.provider, 'signal_close', {
      signalId,
      exitPrice,
      quickCloses: await countRecentQuickCloses(signal.provider),
    });
    
    if (abuseCheck.isAbusive) {
      return createErrorResponse(
        APIErrorCode.BUSINESS_LOGIC_ERROR,
        `Suspicious closing pattern detected: ${abuseCheck.reason}`,
        429,
        { severity: abuseCheck.severity }
      );
    }

    // Calculate enhanced PnL if not provided
    let calculatedPnlPct = pnlPct;
    let calculatedPnlUsd = pnlUsd;
    
    if (calculatedPnlPct === undefined || calculatedPnlUsd === undefined) {
      const leverage = signal.leverage || 1;
      const collateralUsd = signal.collateral_usd || 0;
      
      calculatedPnlPct = calculateUnrealizedPnl(signal.action, signal.entry_price, exitPrice, leverage);
      calculatedPnlUsd = collateralUsd * (calculatedPnlPct / 100);
      
      // Account for fees and slippage if provided
      if (feesUsd || slippagePct) {
        const totalFees = (feesUsd || 0) + (collateralUsd * (slippagePct || 0) / 100);
        calculatedPnlUsd -= totalFees;
        calculatedPnlPct = (calculatedPnlUsd / collateralUsd) * 100;
      }
    }

    // Enhanced onchain verification for exit transaction if provided
    if (exitTxHash) {
      try {
        const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
        const txRes = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt",
            params: [exitTxHash],
          }),
          signal: AbortSignal.timeout(10000),
        });
        
        const txData = await txRes.json();
        if (!txData.result) {
          return createErrorResponse(
            APIErrorCode.VALIDATION_ERROR,
            "Exit transaction hash not found onchain",
            400
          );
        }

        const txFrom = txData.result.from?.toLowerCase();
        const txTo = txData.result.to?.toLowerCase();
        const providerLower = signal.provider.toLowerCase();
        
        // ERC-4337 EntryPoint contracts
        const ERC4337_ENTRYPOINTS = new Set([
          "0x0000000071727de22e5e9d8baf0edac6f37da032",
          "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
        ]);
        
        const isDirectSender = txFrom === providerLower;
        const isERC4337 = ERC4337_ENTRYPOINTS.has(txTo || "");
        
        if (!isDirectSender && !isERC4337) {
          // Allow if provider is involved in transaction logs
          const logs = txData.result.logs || [];
          const involvedInLogs = logs.some((log: any) =>
            log.topics?.some((t: string) => t.toLowerCase().includes(providerLower.slice(2))) ||
            log.data?.toLowerCase().includes(providerLower.slice(2))
          );
          
          if (!involvedInLogs) {
            return createErrorResponse(
              APIErrorCode.VALIDATION_ERROR,
              "Provider address not found in exit transaction",
              400
            );
          }
        }
      } catch (err: any) {
        console.error("Exit TX verification warning:", err.message);
        // Continue - don't block closing for RPC issues
      }
    }

    // Calculate holding time
    const holdingTimeMs = Date.now() - new Date(signal.timestamp).getTime();
    const holdingHours = Math.round((holdingTimeMs / (1000 * 60 * 60)) * 10) / 10;

    // Update signal with enhanced data
    // Only write columns that exist in the DB
    const updateData: Record<string, any> = {
      status: SignalStatus.CLOSED,
      exit_price: exitPrice,
      exit_timestamp: new Date().toISOString(),
      pnl_pct: calculatedPnlPct,
      pnl_usd: calculatedPnlUsd,
      ...(exitTxHash && { exit_tx_hash: exitTxHash }),
    };

    // Close the signal
    const { data: closedSignal, error } = await supabase
      .from("signals")
      .update(updateData)
      .eq("id", signalId)
      .select()
      .single();

    if (error) {
      console.error("Signal close error:", error);
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Failed to close signal",
        500
      );
    }

    // Fire position closed webhooks
    firePositionClosedWebhooks(closedSignal);

    return createSuccessResponse(
      { 
        signal: dbToApiSignal(closedSignal),
        message: "Signal closed successfully",
        pnl: {
          percentage: calculatedPnlPct,
          usd: calculatedPnlUsd,
          holdingHours,
          fees: feesUsd || 0,
          slippage: slippagePct || 0,
        }
      },
      200
    );

  } catch (error: any) {
    console.error("Close signal error:", error);
    
    if (error.message?.includes('JSON')) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        "Invalid JSON in request body",
        400
      );
    }
    
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Internal server error",
      500
    );
  }
}

// Helper function to count recent quick closes (potential abuse pattern)
async function countRecentQuickCloses(provider: string): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from("signals")
      .select("id")
      .eq("provider", provider.toLowerCase())
      .eq("status", "closed")
      .gte("exit_timestamp", oneHourAgo)
      .lt("holding_hours", 0.25); // Less than 15 minutes

    if (error) return 0;
    return data?.length || 0;
  } catch {
    return 0;
  }
}

// Fire webhooks for position closure (async)
async function firePositionClosedWebhooks(signal: any) {
  try {
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("active", true);

    if (!webhooks || webhooks.length === 0) return;

    const payload = {
      type: "position_closed",
      signal: dbToApiSignal(signal),
      timestamp: new Date().toISOString(),
    };

    // Fire webhooks (don't await, fire-and-forget)
    webhooks.forEach(async (webhook) => {
      try {
        await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "BankrSignals-Webhook/2.0",
            "X-Webhook-ID": webhook.id,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(webhook.timeout_ms || 10000)
        });

        // Update success count
        await supabase
          .from("webhooks")
          .update({ 
            last_triggered: new Date().toISOString(),
            success_count: (webhook.success_count || 0) + 1,
            failure_count: 0 
          })
          .eq("id", webhook.id);
      } catch (error: any) {
        // Increment failure count
        const newFailures = (webhook.failure_count || 0) + 1;
        const updates: any = { 
          failure_count: newFailures,
          last_failure: new Date().toISOString(),
        };
        
        if (newFailures >= (webhook.max_failures || 10)) {
          updates.active = false;
        }
        
        await supabase
          .from("webhooks")
          .update(updates)
          .eq("id", webhook.id);
      }
    });
  } catch (error: any) {
    console.error("Webhook firing error:", error);
  }
}