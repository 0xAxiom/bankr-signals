/**
 * Rate limiting and abuse prevention for bankr-signals API
 * Uses in-memory cache with fallback to Supabase for persistence
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstRequest: number;
}

// In-memory rate limit cache
const rateLimitCache = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60_000; // Clean up every minute

// Enhanced rate limit configurations with tiered limits
export const RATE_LIMITS = {
  // Signal submission (per provider address)
  SIGNAL_SUBMIT: { requests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  SIGNAL_SUBMIT_DAILY: { requests: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100 per day
  
  // Provider registration (per IP) 
  PROVIDER_REGISTER: { requests: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3 per day
  
  // API reads (per IP)
  API_READ: { requests: 100, windowMs: 60 * 1000 }, // 100 per minute
  API_READ_BURST: { requests: 1000, windowMs: 60 * 60 * 1000 }, // 1000 per hour
  
  // Webhook operations (per IP)
  WEBHOOK_REGISTER: { requests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  WEBHOOK_TRIGGER: { requests: 10000, windowMs: 60 * 60 * 1000 }, // 10k per hour for incoming webhooks
  
  // Signal closing (per provider)
  SIGNAL_CLOSE: { requests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
  SIGNAL_CLOSE_DAILY: { requests: 500, windowMs: 24 * 60 * 60 * 1000 }, // 500 per day
  
  // Provider tier-based limits
  PREMIUM_MULTIPLIER: 5, // Premium providers get 5x limits
  VERIFIED_MULTIPLIER: 2, // Verified providers get 2x limits
};

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitCache.entries()) {
    if (now > entry.resetAt) {
      rateLimitCache.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function checkRateLimit(
  identifier: string,
  limit: { requests: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / limit.windowMs)}`;
  
  let entry = rateLimitCache.get(key);
  
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + limit.windowMs,
      firstRequest: now,
    };
    rateLimitCache.set(key, entry);
  }

  entry.count++;
  
  const allowed = entry.count <= limit.requests;
  const remaining = Math.max(0, limit.requests - entry.count);
  
  return {
    allowed,
    limit: limit.requests,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}

export function rateLimitResponse(result: RateLimitResult, message?: string) {
  return new Response(
    JSON.stringify({
      error: message || "Rate limit exceeded",
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetAt.toString(),
        ...(result.retryAfter && { "Retry-After": result.retryAfter.toString() }),
      },
    }
  );
}

export function getClientIP(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  // Fallback for development
  return "unknown-ip";
}

/**
 * Enhanced abuse detection with sophisticated pattern recognition
 */
export interface AbuseCheck {
  isAbusive: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1 confidence score
  suggestedAction?: 'warn' | 'throttle' | 'block' | 'review';
}

export function detectAbuse(
  identifier: string,
  action: string,
  metadata?: Record<string, any>
): AbuseCheck {
  const patterns = [];
  
  // Pattern 1: Rapid identical requests
  if (metadata?.similarRequestsInMinute && metadata.similarRequestsInMinute > 20) {
    patterns.push({
      type: 'rapid_identical',
      severity: 'high',
      confidence: 0.95,
      reason: `${metadata.similarRequestsInMinute} identical requests in 1 minute`,
    });
  }
  
  // Pattern 2: Duplicate signals with minimal variation
  if (action === 'signal_submit' && metadata?.duplicateSignalCount && metadata.duplicateSignalCount > 3) {
    patterns.push({
      type: 'duplicate_signals',
      severity: 'medium',
      confidence: 0.8,
      reason: `${metadata.duplicateSignalCount} near-duplicate signals detected`,
    });
  }
  
  // Pattern 3: Authentication brute force
  if (metadata?.failedAuthAttempts && metadata.failedAuthAttempts > 10) {
    patterns.push({
      type: 'auth_brute_force',
      severity: 'high',
      confidence: 0.9,
      reason: `${metadata.failedAuthAttempts} failed authentication attempts`,
    });
  }
  
  // Pattern 4: Impossible trading patterns
  if (action === 'signal_submit' && metadata?.impossiblePriceMove) {
    patterns.push({
      type: 'impossible_price',
      severity: 'critical',
      confidence: 0.99,
      reason: "Signal price deviates impossibly from market",
    });
  }
  
  // Pattern 5: High-frequency opposite signals (wash trading)
  if (metadata?.oppositeSignalsInHour && metadata.oppositeSignalsInHour > 10) {
    patterns.push({
      type: 'wash_trading',
      severity: 'high',
      confidence: 0.85,
      reason: `${metadata.oppositeSignalsInHour} opposite signals in 1 hour (potential wash trading)`,
    });
  }
  
  // Pattern 6: Unusual collateral amounts (round numbers, suspicious patterns)
  if (action === 'signal_submit' && metadata?.collateralUsd) {
    const collateral = metadata.collateralUsd;
    if (collateral === Math.round(collateral) && collateral > 10000) {
      patterns.push({
        type: 'suspicious_collateral',
        severity: 'low',
        confidence: 0.4,
        reason: "Unusually round collateral amount for large position",
      });
    }
  }
  
  // Pattern 7: Geographic anomalies (if IP geolocation available)
  if (metadata?.rapidGeoChanges && metadata.rapidGeoChanges > 3) {
    patterns.push({
      type: 'geo_hopping',
      severity: 'medium',
      confidence: 0.7,
      reason: "Rapid geographic location changes",
    });
  }
  
  // Pattern 8: Timing patterns (signals at exact intervals)
  if (metadata?.timingPatternScore && metadata.timingPatternScore > 0.8) {
    patterns.push({
      type: 'bot_timing',
      severity: 'medium',
      confidence: metadata.timingPatternScore,
      reason: "Signals follow suspicious timing patterns",
    });
  }

  // Aggregate patterns to determine overall abuse score
  if (patterns.length === 0) {
    return { isAbusive: false, severity: 'low', confidence: 0 };
  }

  // Calculate composite abuse score
  const maxSeverityPattern = patterns.reduce((max, p) => 
    getSeverityScore(p.severity) > getSeverityScore(max.severity) ? p : max
  );

  const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
  const combinedReason = patterns.length === 1 
    ? maxSeverityPattern.reason
    : `Multiple patterns: ${patterns.map(p => p.type).join(', ')}`;

  return {
    isAbusive: maxSeverityPattern.severity === 'critical' || 
               (maxSeverityPattern.severity === 'high' && avgConfidence > 0.8),
    reason: combinedReason,
    severity: maxSeverityPattern.severity as 'low' | 'medium' | 'high' | 'critical',
    confidence: avgConfidence,
    suggestedAction: getSuggestedAction(maxSeverityPattern.severity, avgConfidence),
  };
}

function getSeverityScore(severity: string): number {
  const scores = { low: 1, medium: 2, high: 3, critical: 4 };
  return scores[severity as keyof typeof scores] || 0;
}

function getSuggestedAction(severity: string, confidence: number): 'warn' | 'throttle' | 'block' | 'review' {
  if (severity === 'critical') return 'block';
  if (severity === 'high' && confidence > 0.8) return 'block';
  if (severity === 'high') return 'throttle';
  if (severity === 'medium' && confidence > 0.7) return 'throttle';
  if (severity === 'medium') return 'warn';
  return 'review';
}