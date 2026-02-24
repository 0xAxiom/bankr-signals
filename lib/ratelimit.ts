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

// Rate limit configurations
export const RATE_LIMITS = {
  // Signal submission (per provider address per hour)
  SIGNAL_SUBMIT: { requests: 10, windowMs: 60 * 60 * 1000 },
  
  // Provider registration (per IP per day) 
  PROVIDER_REGISTER: { requests: 3, windowMs: 24 * 60 * 60 * 1000 },
  
  // API reads (per IP per minute)
  API_READ: { requests: 100, windowMs: 60 * 1000 },
  
  // Webhook registration (per IP per hour)
  WEBHOOK_REGISTER: { requests: 5, windowMs: 60 * 60 * 1000 },
  
  // Signal closing (per provider per hour)
  SIGNAL_CLOSE: { requests: 20, windowMs: 60 * 60 * 1000 },
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
 * Detect potential abuse patterns
 */
export interface AbuseCheck {
  isAbusive: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
}

export function detectAbuse(
  identifier: string,
  action: string,
  metadata?: Record<string, any>
): AbuseCheck {
  // Pattern 1: Rapid identical requests
  if (metadata?.similarRequestsInMinute && metadata.similarRequestsInMinute > 20) {
    return {
      isAbusive: true,
      reason: "Identical requests at suspicious rate",
      severity: 'high'
    };
  }
  
  // Pattern 2: Provider submitting signals with identical parameters
  if (action === 'signal_submit' && metadata?.duplicateSignalCount && metadata.duplicateSignalCount > 3) {
    return {
      isAbusive: true,
      reason: "Duplicate signal parameters",
      severity: 'medium'
    };
  }
  
  // Pattern 3: Excessive failed authentication attempts
  if (metadata?.failedAuthAttempts && metadata.failedAuthAttempts > 10) {
    return {
      isAbusive: true,
      reason: "Excessive authentication failures",
      severity: 'high'
    };
  }
  
  return { isAbusive: false, severity: 'low' };
}