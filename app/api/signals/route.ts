import { NextRequest, NextResponse } from "next/server";
import { dbGetSignals, dbGetSignalsByProvider, dbGetProvider, dbAddSignal, supabase } from "@/lib/db";
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
import { SignalAction, SignalCategory, RiskLevel, TimeFrame, SignalStatus } from "@/lib/types";
import { extractEntryPrice } from "@/lib/onchain-price";

export const dynamic = "force-dynamic";

const VALID_ACTIONS = Object.values(SignalAction);
const VALID_CATEGORIES = Object.values(SignalCategory);
const VALID_RISK_LEVELS = Object.values(RiskLevel);
const VALID_TIME_FRAMES = Object.values(TimeFrame);

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

      // Enhanced filters
      if (webhook.category_filter && webhook.category_filter !== signal.category) {
        return false;
      }

      if (webhook.risk_level_filter && webhook.risk_level_filter !== signal.risk_level) {
        return false;
      }

      if (webhook.min_confidence && (signal.confidence || 0) < webhook.min_confidence) {
        return false;
      }

      if (webhook.min_collateral_usd && (signal.collateral_usd || 0) < webhook.min_collateral_usd) {
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
            'User-Agent': 'BankrSignals-Webhook/2.0',
            'X-Webhook-ID': webhook.id,
          },
          body: JSON.stringify({
            type: 'new_signal',
            signal: dbToApiSignal(signal),
            timestamp: new Date().toISOString(),
            webhook_id: webhook.id,
          }),
          signal: AbortSignal.timeout(webhook.timeout_ms || 10000)
        });

        if (response.ok) {
          // Reset failure count on success
          await supabase
            .from("webhooks")
            .update({ 
              last_triggered: new Date().toISOString(),
              success_count: (webhook.success_count || 0) + 1,
              failure_count: 0 
            })
            .eq("id", webhook.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error: any) {
        // Increment failure count, deactivate after configured max failures
        const newFailures = (webhook.failure_count || 0) + 1;
        const maxFailures = webhook.max_failures || 10;
        const updates: any = { 
          failure_count: newFailures,
          last_failure: new Date().toISOString(),
        };
        
        if (newFailures >= maxFailures) {
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

// GET /api/signals - List signals with enhanced filtering and pagination
export async function GET(req: NextRequest) {
  try {
    // No auto-expiry — positions can stay open for weeks

    // Rate limiting for API reads
    const clientIP = getClientIP(req);
    const readLimit = checkRateLimit(`read:${clientIP}`, RATE_LIMITS.API_READ);
    
    if (!readLimit.allowed) {
      return rateLimitResponse(readLimit, "Too many API requests");
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const token = searchParams.get("token");
    const riskLevel = searchParams.get("riskLevel");
    const timeFrame = searchParams.get("timeFrame");
    const minConfidence = searchParams.get("minConfidence");
    const minCollateral = searchParams.get("minCollateral");
    const tags = searchParams.get("tags")?.split(',').filter(Boolean) || [];
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const sortBy = searchParams.get("sortBy") || "timestamp";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    // Build query with enhanced filters
    let query = supabase
      .from("signals")
      .select("*", { count: "exact" });

    if (provider) {
      if (!ValidationPatterns.ETH_ADDRESS.test(provider)) {
        return createErrorResponse(
          APIErrorCode.VALIDATION_ERROR,
          "Invalid provider address format",
          400
        );
      }
      query = query.ilike("provider", provider);
    }

    if (category && VALID_CATEGORIES.includes(category as SignalCategory)) {
      query = query.eq("category", category);
    }

    if (status && Object.values(SignalStatus).includes(status as SignalStatus)) {
      query = query.eq("status", status);
    }

    if (token) {
      query = query.ilike("token", token);
    }

    if (riskLevel && VALID_RISK_LEVELS.includes(riskLevel as RiskLevel)) {
      query = query.eq("risk_level", riskLevel);
    }

    if (timeFrame && VALID_TIME_FRAMES.includes(timeFrame as TimeFrame)) {
      query = query.eq("time_frame", timeFrame);
    }

    if (minConfidence) {
      const conf = parseFloat(minConfidence);
      if (!isNaN(conf)) {
        query = query.gte("confidence", conf);
      }
    }

    if (minCollateral) {
      const collat = parseFloat(minCollateral);
      if (!isNaN(collat)) {
        query = query.gte("collateral_usd", collat);
      }
    }

    if (tags.length > 0) {
      // Filter by tags (PostgreSQL array overlap operator)
      query = query.overlaps("tags", tags);
    }

    // Pagination
    const offset = (page - 1) * limit;
    const validSortFields = ["timestamp", "entry_price", "collateral_usd", "confidence", "pnl_pct"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "timestamp";
    
    query = query
      .range(offset, offset + limit - 1)
      .order(sortField, { ascending: order === "asc" });

    const { data: signals, error, count } = await query;

    if (error) {
      console.error("Signals query error:", error);
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Database query failed",
        500
      );
    }

    // Format response with enhanced fields
    const formatted = (signals || []).map(dbToApiSignal);

    return createSuccessResponse(
      {
        signals: formatted,
      },
      200,
      {
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (count || 0) > offset + limit,
        },
      }
    );
  } catch (error: any) {
    console.error("Signals GET error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Internal server error",
      500
    );
  }
}

// POST /api/signals - Submit a new signal with enhanced validation and features
export async function POST(req: NextRequest) {
  try {
    // Request size validation
    const sizeError = validateRequestSize(req, 50 * 1024); // 50KB max
    if (sizeError) {
      return createErrorResponse(sizeError.code, sizeError.message, 413);
    }

    const body = await req.json();
    
    // Enhanced validation rules with stricter requirements
    const validationError = validateRequest(body, [
      { field: "provider", required: true, type: "string", custom: CustomValidators.ethAddress },
      { field: "action", required: true, type: "string", enum: VALID_ACTIONS },
      { field: "token", required: true, type: "string", pattern: ValidationPatterns.TOKEN_SYMBOL },
      { field: "entryPrice", required: false, type: "number" }, // Optional — derived from on-chain TX data
      { field: "collateralUsd", required: true, type: "number", custom: (value: number) => {
        if (value <= 0) return "collateralUsd must be positive";
        if (value < 1) return "collateralUsd must be at least $1";
        if (value > 1000000) return "collateralUsd cannot exceed $1,000,000";
        return null;
      }},
      { field: "txHash", required: true, type: "string", custom: CustomValidators.txHash },
      { field: "message", required: true, type: "string", minLength: 10 },
      { field: "signature", required: true, type: "string", pattern: /^0x[a-fA-F0-9]{130}$/ },
      
      // Enhanced optional fields
      { field: "category", type: "string", enum: VALID_CATEGORIES },
      { field: "riskLevel", type: "string", enum: VALID_RISK_LEVELS },
      { field: "timeFrame", type: "string", enum: VALID_TIME_FRAMES },
      { field: "chain", type: "string", minLength: 1, maxLength: 20 },
      { field: "leverage", type: "number", min: 1, max: 100 },
      { field: "confidence", type: "number", min: 0, max: 1 },
      { field: "stopLossPct", type: "number", min: 0.1, max: 90 }, // Minimum 0.1%, max 90%
      { field: "takeProfitPct", type: "number", min: 0.1, max: 1000 }, // Minimum 0.1%, max 1000%
      { field: "positionSize", type: "number", min: 0.01, max: 100 }, // Min 0.01%, max 100%
      { field: "riskRewardRatio", type: "number", min: 0.1, max: 100 },
      { field: "reasoning", type: "string", maxLength: 1000 },
      { field: "expiresAt", type: "string", custom: CustomValidators.futureTimestamp },
      { field: "tags", type: "array" }, // Allow array of strings
    ]);

    if (validationError) {
      return createErrorResponse(validationError.code, validationError.message, 400, {}, validationError.field);
    }

    const {
      provider, action, token, chain, entryPrice, collateralUsd, txHash,
      leverage, confidence, reasoning, stopLossPct, takeProfitPct,
      category, riskLevel, timeFrame, tags, expiresAt, positionSize,
      riskRewardRatio, technicalIndicators, message, signature,
    } = body;

    // Rate limiting per provider
    const providerLimit = checkRateLimit(`signal:${provider.toLowerCase()}`, RATE_LIMITS.SIGNAL_SUBMIT);
    if (!providerLimit.allowed) {
      return rateLimitResponse(providerLimit, "Signal submission rate limit exceeded for this provider");
    }

    // Abuse detection
    const abuseCheck = detectAbuse(provider, 'signal_submit', {
      token,
      entryPrice,
      collateralUsd,
    });
    
    if (abuseCheck.isAbusive) {
      return createErrorResponse(
        APIErrorCode.BUSINESS_LOGIC_ERROR,
        `Suspicious activity detected: ${abuseCheck.reason}`,
        429,
        { severity: abuseCheck.severity }
      );
    }

    // Enhanced message format validation
    const msgMatch = message.match(/^bankr-signals:signal:(0x[a-fA-F0-9]{40}):(\w+):(\w+):(\d+)$/);
    if (!msgMatch) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Invalid message format. Expected: bankr-signals:signal:{provider}:{action}:{token}:{timestamp}",
        400
      );
    }

    if (msgMatch[1].toLowerCase() !== provider.toLowerCase()) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Provider in message does not match request",
        400
      );
    }

    // Check timestamp freshness (5 min window)
    const msgTimestamp = parseInt(msgMatch[4]);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - msgTimestamp) > 300) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Message timestamp expired (5 minute window)",
        400
      );
    }

    // Verify signature
    const valid = await verifySignature(provider, message, signature);
    if (!valid) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Invalid signature",
        401
      );
    }

    // Check provider is registered
    const providerRecord = await dbGetProvider(provider);
    if (!providerRecord) {
      return createErrorResponse(
        APIErrorCode.AUTHORIZATION_ERROR,
        "Provider not registered. Register at /api/providers/register first",
        403
      );
    }

    // Enhanced onchain verification
    try {
      const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
      const txRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt",
          params: [txHash],
        }),
        signal: AbortSignal.timeout(10000),
      });
      
      const txData = await txRes.json();
      if (!txData.result) {
        return createErrorResponse(
          APIErrorCode.VALIDATION_ERROR,
          "Transaction hash not found onchain. Submit a valid Base transaction.",
          400
        );
      }

      const txFrom = txData.result.from?.toLowerCase();
      const txTo = txData.result.to?.toLowerCase();
      const providerLower = provider.toLowerCase();
      const logs = txData.result.logs || [];
      
      // ERC-4337 EntryPoint contracts — all bundler-submitted txs go TO these
      const ERC4337_ENTRYPOINTS = new Set([
        "0x0000000071727de22e5e9d8baf0edac6f37da032", // EntryPoint v0.7
        "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789", // EntryPoint v0.6
      ]);
      
      // Known relayer/router contracts
      const KNOWN_RELAYERS = new Set([
        "0x591dc14b5cd66c104bdeb17d5e2bc844ca317400", // Bankr router
      ]);
      
      // Check if this is an ERC-4337 bundled tx (handleOps to EntryPoint)
      // Any bundler can submit these — we only check the EntryPoint destination
      const isERC4337 = ERC4337_ENTRYPOINTS.has(txTo || "");
      
      // Check if provider is involved in transaction:
      // 1. Direct sender (EOA wallet)
      // 2. ERC-4337 bundled tx (any bundler -> EntryPoint)
      // 3. Sent by/to a known relayer contract
      // 4. Provider appears in event logs
      const isDirectSender = txFrom === providerLower;
      const isSentByRelayer = KNOWN_RELAYERS.has(txFrom) || KNOWN_RELAYERS.has(txTo || "");
      const involvedInLogs = logs.some((log: any) =>
        log.topics?.some((t: string) => t.toLowerCase().includes(providerLower.slice(2))) ||
        log.data?.toLowerCase().includes(providerLower.slice(2))
      );
      
      if (!isDirectSender && !isERC4337 && !isSentByRelayer && !involvedInLogs) {
        return createErrorResponse(
          APIErrorCode.VALIDATION_ERROR,
          "Provider address not found in transaction. Submit your own transactions only.",
          400
        );
      }
    } catch (err: any) {
      console.error("TX verification warning:", err.message);
      // Continue - availability over strictness for RPC issues
    }

    // ── On-chain entry price extraction (source of truth) ──
    let onchainEntryPrice: number | undefined;
    let onchainCollateralUsd: number | undefined;
    let onchainTokenAddress: string | undefined;
    
    if (txHash) {
      try {
        const priceResult = await extractEntryPrice(txHash, token, provider);
        if (priceResult) {
          // Validate that on-chain token matches claimed token
          const onchainSymbol = priceResult.tokenSymbol?.toUpperCase();
          const claimedSymbol = token.toUpperCase();
          // Well-known aliases (ETH/WETH are the same)
          const ALIASES: Record<string, string[]> = {
            "ETH": ["WETH", "ETH"],
            "WETH": ["WETH", "ETH"],
            "BTC": ["WBTC", "BTC", "cbBTC"],
            "WBTC": ["WBTC", "BTC", "cbBTC"],
          };
          const acceptableSymbols = ALIASES[claimedSymbol] || [claimedSymbol];
          
          if (onchainSymbol && !acceptableSymbols.includes(onchainSymbol)) {
            return createErrorResponse(
              APIErrorCode.VALIDATION_ERROR,
              `Token mismatch: signal claims ${claimedSymbol} but on-chain TX trades ${onchainSymbol}. Submit the correct token symbol.`,
              400
            );
          }
          
          onchainEntryPrice = priceResult.entryPrice;
          onchainCollateralUsd = priceResult.collateralUsd;
          onchainTokenAddress = priceResult.tokenAddress;
          console.log(`On-chain price extracted: ${onchainEntryPrice} (${priceResult.quoteToken} → ${token}, collateral: $${onchainCollateralUsd})`);
        } else {
          console.warn(`Could not extract on-chain price for TX ${txHash}, falling back to submitted price`);
        }
      } catch (err: any) {
        console.warn(`On-chain price extraction failed: ${err.message}, falling back to submitted price`);
      }
    }
    
    // Require either on-chain price or submitted price
    let finalEntryPrice = onchainEntryPrice || (entryPrice ? parseFloat(entryPrice) : 0);
    const finalCollateralUsd = onchainCollateralUsd || (collateralUsd ? parseFloat(collateralUsd) : 0);
    
    // For traditional assets (stocks, forex, metals, commodities, indices),
    // validate the submitted entry price against real market data.
    // Avantis perps don't have on-chain token swaps, so entry price comes from submission.
    // Sanity check: submitted price must be within 10% of the actual market price.
    const { isTraditionalAsset: isTradAsset, getTokenPrice: getTradPrice } = await import("@/lib/prices");
    if (isTradAsset(token) && !onchainEntryPrice) {
      try {
        const marketPrice = await getTradPrice(token);
        if (marketPrice && finalEntryPrice > 0) {
          const deviation = Math.abs(finalEntryPrice - marketPrice.price) / marketPrice.price;
          if (deviation > 0.10) {
            console.warn(`Entry price sanity check failed for ${token}: submitted=$${finalEntryPrice}, market=$${marketPrice.price} (${(deviation * 100).toFixed(1)}% off). Using market price.`);
            finalEntryPrice = marketPrice.price;
          }
        }
      } catch (err: any) {
        console.warn(`Traditional asset price validation failed: ${err.message}`);
      }
    }
    
    if (finalEntryPrice <= 0) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        "Could not determine entry price from on-chain data and no valid entryPrice was submitted",
        400
      );
    }
    
    if (finalCollateralUsd <= 0) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        "Could not determine collateral from on-chain data and no valid collateralUsd was submitted",
        400
      );
    }

    // ── Enhanced Data Validation ──
    // Reject signals with obviously wrong entry prices
    const tokenUpper = token.toUpperCase();
    
    // Price sanity checks for major tokens
    const PRICE_BOUNDS: Record<string, { min: number, max: number }> = {
      'ETH': { min: 100, max: 100000 },      // ETH: $100 - $100,000
      'BTC': { min: 10000, max: 1000000 },   // BTC: $10,000 - $1,000,000  
      'SOL': { min: 5, max: 5000 },          // SOL: $5 - $5,000
      'AVAX': { min: 5, max: 5000 },         // AVAX: $5 - $5,000
      'MATIC': { min: 0.1, max: 100 },       // MATIC: $0.10 - $100
      'LINK': { min: 1, max: 1000 },         // LINK: $1 - $1,000
      'DOGE': { min: 0.01, max: 10 },        // DOGE: $0.01 - $10
      'ARB': { min: 0.1, max: 100 },         // ARB: $0.10 - $100
      'OP': { min: 0.1, max: 100 },          // OP: $0.10 - $100
    };
    
    const bounds = PRICE_BOUNDS[tokenUpper];
    if (bounds && (finalEntryPrice < bounds.min || finalEntryPrice > bounds.max)) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        `Invalid ${tokenUpper} entry price $${finalEntryPrice}. Expected range: $${bounds.min} - $${bounds.max}. Please verify the price is correct.`,
        400
      );
    }
    
    // Detect scientific notation parsing errors (like $2e-9 for ETH)
    if (finalEntryPrice < 0.000001) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        `Entry price $${finalEntryPrice} is too small and may be a parsing error. Please submit a reasonable price.`,
        400
      );
    }

    // ── Duplicate Signal Detection (Enhanced) ──
    // Check for exact duplicate TX hashes first (blocking)
    try {
      const { data: existingTx, error: txError } = await supabase
        .from("signals")
        .select("id, provider, action, token, entry_price, timestamp")
        .eq("tx_hash", txHash)
        .limit(1);
      
      if (txError) {
        console.warn("Duplicate TX check error:", txError);
      } else if (existingTx && existingTx.length > 0) {
        const existing = existingTx[0];
        return createErrorResponse(
          APIErrorCode.VALIDATION_ERROR,
          `Duplicate transaction hash already published: Signal ${existing.id} (${existing.action} ${existing.token} @ $${existing.entry_price} by ${existing.provider.slice(0,6)}... at ${existing.timestamp})`,
          400
        );
      }
    } catch (err: any) {
      console.warn("Duplicate TX check failed:", err.message);
      // Continue - don't block for DB issues
    }

    // Enhanced signal status logic with better auto-close rules
    const actionUpper = action.toUpperCase() as SignalAction;
    
    // All signals start open — positions are closed explicitly by the provider.
    // BUY/SELL are entries, not completed trades.
    const defaultStatus = SignalStatus.OPEN;

    // ── Stale Signal Flagging ──
    // For open signals, add metadata about age for monitoring
    const signalAge = Date.now() - msgTimestamp * 1000;
    const ageHours = signalAge / (1000 * 60 * 60);
    const isStaleSignal = ageHours > 24 && defaultStatus === SignalStatus.OPEN;
    
    if (isStaleSignal) {
      console.warn(`Potentially stale signal: ${ageHours.toFixed(1)}h old for ${action} ${token}`);
    }

    // Only use provider-specified expiresAt. Never auto-assign one.
    // Positions can stay open for weeks — the provider closes them when they're done.
    let calculatedExpiresAt = expiresAt || null;

    // Generate enhanced signal ID
    const timestamp = Date.now();
    const id = `sig_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Enhanced signal data with all new fields
    const signalData = {
      id,
      provider: provider.toLowerCase(),
      action: actionUpper,
      token: token.toUpperCase(),
      chain: chain || "base",
      entryPrice: finalEntryPrice,
      collateralUsd: finalCollateralUsd,
      txHash,
      leverage: leverage ? parseInt(leverage) : null,
      confidence: confidence ? parseFloat(confidence) : null,
      reasoning: reasoning || null,
      stopLossPct: stopLossPct ? parseFloat(stopLossPct) : null,
      takeProfitPct: takeProfitPct ? parseFloat(takeProfitPct) : null,
      status: defaultStatus,
      
      // Enhanced fields
      category: category as SignalCategory,
      riskLevel: riskLevel as RiskLevel || RiskLevel.MEDIUM,
      timeFrame: timeFrame as TimeFrame || TimeFrame.D1,
      tags: (() => {
        let signalTags = Array.isArray(tags) ? tags.slice(0, 10) : [];
        // Add stale signal flag for monitoring
        if (isStaleSignal) {
          signalTags.push('stale_at_submission');
        }
        return signalTags;
      })(),
      expiresAt: calculatedExpiresAt || null,
      positionSize: positionSize ? parseFloat(positionSize) : null,
      riskRewardRatio: riskRewardRatio ? parseFloat(riskRewardRatio) : null,
      
      // Calculate risk-reward if stop loss and take profit are provided
      ...(stopLossPct && takeProfitPct && !riskRewardRatio && {
        riskRewardRatio: takeProfitPct / stopLossPct
      }),
      
      // Token contract address — prefer on-chain extraction
      tokenAddress: onchainTokenAddress || body.tokenAddress || null,
    };

    // Duplicate detection (non-blocking)
    try {
      await checkForDuplicateSignals(signalData);
    } catch (e: any) {
      console.warn("Duplicate check error:", e.message);
    }

    const signal = await dbAddSignal(signalData);
    
    // Check for auto-close opportunities (BUY followed by SELL or SHORT followed by COVER)
    if (signalData.action === SignalAction.SELL) {
      // Import and call auto-close logic asynchronously
      import("@/lib/position-manager").then(({ checkSignalPairAutoClose }) => {
        checkSignalPairAutoClose(signal).catch(console.error);
      });
    }

    // Fire webhooks (async, don't block response)
    fireWebhooks(signal);

    return createSuccessResponse(
      { signal: dbToApiSignal(signal) },
      201
    );

  } catch (error: any) {
    console.error("Signal POST error:", error);
    
    if (error.message?.includes('JSON')) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        "Invalid JSON in request body",
        400
      );
    }
    
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      `Internal server error: ${error.message || 'unknown'}`,
      500
    );
  }
}
// Helper function to check for duplicate signals
async function checkForDuplicateSignals(signalData: any): Promise<void> {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    
    const { data: recentSignals, error } = await supabase
      .from("signals")
      .select("id, tx_hash, entry_price, token, action")
      .eq("provider", signalData.provider)
      .eq("token", signalData.token)
      .eq("action", signalData.action)
      .gte("timestamp", oneMinuteAgo);

    if (error) return; // Don't block on DB errors

    const duplicates = recentSignals?.filter(s => 
      s.tx_hash === signalData.txHash ||
      (Math.abs(s.entry_price - signalData.entryPrice) / signalData.entryPrice < 0.001) // Same price within 0.1%
    ) || [];

    if (duplicates.length > 0) {
      throw new Error("Potential duplicate signal detected");
    }
  } catch (error) {
    console.warn("Duplicate check warning:", error);
    // Don't throw - this is just a warning check
  }
}
