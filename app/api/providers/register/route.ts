import { NextRequest, NextResponse } from "next/server";
import { dbRegisterProvider, dbGetProvider, dbGetProviders, dbGetProviderByName } from "@/lib/db";
import { verifySignature } from "@/lib/auth";
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
  RATE_LIMITS,
} from "@/lib/ratelimit";
import {
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
  ValidationPatterns,
  CustomValidators,
  APIErrorCode,
  dbToApiProvider,
} from "@/lib/api-utils";
import {
  calculateProviderVerification,
  updateProviderVerification,
} from "@/lib/provider-verification";
import { SignalCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting per IP
    const clientIP = getClientIP(req);
    const registerLimit = checkRateLimit(`register:${clientIP}`, RATE_LIMITS.PROVIDER_REGISTER);
    
    if (!registerLimit.allowed) {
      return rateLimitResponse(registerLimit, "Provider registration rate limit exceeded");
    }

    const body = await req.json();
    
    // Enhanced validation
    const validationError = validateRequest(body, [
      { field: "address", required: true, type: "string", custom: CustomValidators.ethAddress },
      { field: "name", required: true, type: "string", minLength: 2, maxLength: 50 },
      { field: "message", required: true, type: "string", minLength: 10 },
      { field: "signature", required: true, type: "string", pattern: /^0x[a-fA-F0-9]{130}$/ },
      
      // Optional fields with validation
      { field: "bio", type: "string", maxLength: 280 },
      { field: "description", type: "string", maxLength: 1000 },
      { field: "website", type: "string", custom: CustomValidators.url },
      { field: "twitter", type: "string", pattern: ValidationPatterns.SOCIAL_HANDLE },
      { field: "farcaster", type: "string", pattern: ValidationPatterns.SOCIAL_HANDLE },
      { field: "github", type: "string", pattern: ValidationPatterns.SOCIAL_HANDLE },
      { field: "chain", type: "string", minLength: 1, maxLength: 20 },
      { field: "agent", type: "string", maxLength: 100 },
      { field: "subscriptionFee", type: "number", min: 0, max: 1000 },
      { field: "freeSignalsPerMonth", type: "number", min: 0, max: 100 },
    ]);

    if (validationError) {
      return createErrorResponse(validationError.code, validationError.message, 400, {}, validationError.field);
    }

    const { 
      address, name, description, bio, avatar, chain, agent, website, 
      twitter, farcaster, github, message, signature, specialties, 
      subscriptionFee, freeSignalsPerMonth 
    } = body;

    // Enhanced message format validation
    const msgMatch = message.match(/^bankr-signals:register:(0x[a-fA-F0-9]{40}):(\d+)$/);
    if (!msgMatch) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Invalid message format. Expected: bankr-signals:register:{address}:{timestamp}",
        400
      );
    }

    if (msgMatch[1].toLowerCase() !== address.toLowerCase()) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Address in message does not match request",
        400
      );
    }

    // Check timestamp freshness (5 min window)
    const msgTimestamp = parseInt(msgMatch[2]);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - msgTimestamp) > 300) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Message timestamp expired (5 minute window)",
        400
      );
    }

    // Verify signature
    const valid = await verifySignature(address, message, signature);
    if (!valid) {
      return createErrorResponse(
        APIErrorCode.AUTHENTICATION_ERROR,
        "Invalid signature",
        401
      );
    }

    // Check if name is already taken by a different address
    const existingByName = await dbGetProviderByName(name);
    if (existingByName && existingByName.address.toLowerCase() !== address.toLowerCase()) {
      return createErrorResponse(
        APIErrorCode.DUPLICATE_ERROR,
        `Name "${name}" is already taken. Please choose a different name.`,
        409
      );
    }

    // Auto-fetch Twitter avatar if twitter handle provided and no avatar specified
    let resolvedAvatar = avatar;
    if (twitter && !avatar) {
      try {
        const avatarUrl = `https://unavatar.io/twitter/${twitter.replace(/^@/, "")}`;
        const avatarCheck = await fetch(avatarUrl, { 
          method: "HEAD", 
          redirect: "follow",
          signal: AbortSignal.timeout(5000)
        });
        if (avatarCheck.ok) {
          resolvedAvatar = avatarUrl;
        }
      } catch {
        // Silently fail, use default avatar
      }
    }

    // Validate specialties if provided
    const validSpecialties = specialties 
      ? specialties.filter((s: string) => Object.values(SignalCategory).includes(s as SignalCategory))
      : [];

    // Register the provider
    const provider = await dbRegisterProvider({
      address, name, bio, description, avatar: resolvedAvatar,
      chain: chain || "base", agent, website, twitter, farcaster, github,
    });

    // Calculate initial verification score
    const verification = await calculateProviderVerification(address);
    await updateProviderVerification(verification);

    const response = {
      provider: dbToApiProvider({
        ...provider,
        specialties: validSpecialties,
        subscription_fee: subscriptionFee || null,
        free_signals_per_month: freeSignalsPerMonth || 10,
        verified: verification.verified,
        verification_level: verification.overallScore,
        tier: verification.tier,
        badges: verification.badges,
      }),
      verification: {
        score: verification.overallScore,
        tier: verification.tier,
        verified: verification.verified,
        checks: verification.checks.map(c => ({
          type: c.type,
          status: c.status,
          score: c.score,
        })),
        badges: verification.badges,
      },
      message: verification.overallScore > 50 
        ? "Provider registered successfully with good verification score"
        : "Provider registered. Complete social profiles and trading history to improve verification score.",
    };

    return createSuccessResponse(response, 201);
    
  } catch (error: any) {
    console.error("Register error:", error);
    
    if (error.message?.includes('duplicate key')) {
      return createErrorResponse(
        APIErrorCode.DUPLICATE_ERROR,
        "Provider address already registered",
        409
      );
    }
    
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Internal server error",
      500
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    if (address) {
      const provider = await dbGetProvider(address);
      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }
      return NextResponse.json(provider);
    }
    
    const providers = await dbGetProviders();
    return NextResponse.json(providers);
  } catch (error: any) {
    console.error("GET providers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
