/**
 * Standardized API utilities for consistent responses and validation
 */

import { NextResponse } from "next/server";

// Standardized error codes
export enum APIErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR", 
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  DUPLICATE_ERROR = "DUPLICATE_ERROR",
  BUSINESS_LOGIC_ERROR = "BUSINESS_LOGIC_ERROR",
}

export interface APIError {
  code: APIErrorCode;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: APIResponse<T>['meta']
): NextResponse {
  const response: APIResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  
  return NextResponse.json(response, { status });
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: APIErrorCode,
  message: string,
  status: number = 400,
  details?: Record<string, any>,
  field?: string
): NextResponse {
  const response: APIResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      field,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  
  return NextResponse.json(response, { status });
}

/**
 * Validation utilities
 */
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: any) => string | null; // Returns error message or null if valid
}

export function validateRequest(data: any, rules: ValidationRule[]): APIError | null {
  for (const rule of rules) {
    const value = data[rule.field];
    
    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        code: APIErrorCode.VALIDATION_ERROR,
        message: `Field '${rule.field}' is required`,
        field: rule.field,
      };
    }
    
    // Skip further validation if not required and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Type validation
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        return {
          code: APIErrorCode.VALIDATION_ERROR,
          message: `Field '${rule.field}' must be of type ${rule.type}, got ${actualType}`,
          field: rule.field,
        };
      }
    }
    
    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return {
          code: APIErrorCode.VALIDATION_ERROR,
          message: `Field '${rule.field}' must be at least ${rule.minLength} characters`,
          field: rule.field,
        };
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        return {
          code: APIErrorCode.VALIDATION_ERROR,
          message: `Field '${rule.field}' must not exceed ${rule.maxLength} characters`,
          field: rule.field,
        };
      }
      
      if (rule.pattern && !rule.pattern.test(value)) {
        return {
          code: APIErrorCode.VALIDATION_ERROR,
          message: `Field '${rule.field}' has invalid format`,
          field: rule.field,
        };
      }
      
      if (rule.enum && !rule.enum.includes(value)) {
        return {
          code: APIErrorCode.VALIDATION_ERROR,
          message: `Field '${rule.field}' must be one of: ${rule.enum.join(', ')}`,
          field: rule.field,
        };
      }
    }
    
    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return {
          code: APIErrorCode.VALIDATION_ERROR,
          message: `Field '${rule.field}' must be at least ${rule.min}`,
          field: rule.field,
        };
      }
      
      if (rule.max !== undefined && value > rule.max) {
        return {
          code: APIErrorCode.VALIDATION_ERROR,
          message: `Field '${rule.field}' must not exceed ${rule.max}`,
          field: rule.field,
        };
      }
    }
    
    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return {
          code: APIErrorCode.VALIDATION_ERROR,
          message: customError,
          field: rule.field,
        };
      }
    }
  }
  
  return null;
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  TX_HASH: /^0x[a-fA-F0-9]{64}$/,
  TOKEN_SYMBOL: /^[A-Za-z0-9\/]{1,20}$/,
  URL: /^https?:\/\/.+\..+/,
  SOCIAL_HANDLE: /^[a-zA-Z0-9_.-]{1,64}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

/**
 * Database column to API field mapping utilities
 */
export function dbToApiSignal(dbSignal: any) {
  return {
    id: dbSignal.id,
    provider: dbSignal.provider,
    timestamp: dbSignal.timestamp,
    action: dbSignal.action,
    token: dbSignal.token,
    chain: dbSignal.chain,
    entryPrice: dbSignal.entry_price,
    leverage: dbSignal.leverage,
    confidence: dbSignal.confidence,
    reasoning: dbSignal.reasoning,
    txHash: dbSignal.tx_hash,
    stopLossPct: dbSignal.stop_loss_pct,
    takeProfitPct: dbSignal.take_profit_pct,
    collateralUsd: dbSignal.collateral_usd,
    status: dbSignal.status,
    exitPrice: dbSignal.exit_price,
    exitTimestamp: dbSignal.exit_timestamp,
    pnlPct: dbSignal.pnl_pct,
    pnlUsd: dbSignal.pnl_usd,
    exitTxHash: dbSignal.exit_tx_hash,
    createdAt: dbSignal.created_at,
    updatedAt: dbSignal.updated_at,
    // New fields
    category: dbSignal.category,
    tags: dbSignal.tags,
    riskLevel: dbSignal.risk_level,
    expiresAt: dbSignal.expires_at,
    parentSignalId: dbSignal.parent_signal_id,
    maxDrawdownPct: dbSignal.max_drawdown_pct,
    roi: dbSignal.roi,
    holdingDays: dbSignal.holding_days,
  };
}

export function dbToApiProvider(dbProvider: any) {
  return {
    address: dbProvider.address,
    name: dbProvider.name,
    bio: dbProvider.bio,
    description: dbProvider.description,
    avatar: dbProvider.avatar,
    chain: dbProvider.chain,
    agent: dbProvider.agent,
    website: dbProvider.website,
    twitter: dbProvider.twitter,
    farcaster: dbProvider.farcaster,
    github: dbProvider.github,
    registeredAt: dbProvider.registered_at,
    // New fields
    verified: dbProvider.verified,
    verificationLevel: dbProvider.verification_level,
    reputation: dbProvider.reputation,
    followers: dbProvider.followers,
    subscriptionFee: dbProvider.subscription_fee,
    createdAt: dbProvider.created_at,
    updatedAt: dbProvider.updated_at,
  };
}

/**
 * Common custom validators
 */
export const CustomValidators = {
  ethAddress: (value: string) => 
    ValidationPatterns.ETH_ADDRESS.test(value) ? null : "Invalid Ethereum address format",
    
  txHash: (value: string) => 
    ValidationPatterns.TX_HASH.test(value) ? null : "Invalid transaction hash format",
    
  positiveNumber: (value: number) =>
    value > 0 ? null : "Must be a positive number",
    
  percentage: (value: number) =>
    (value >= 0 && value <= 100) ? null : "Must be between 0 and 100",
    
  url: (value: string) =>
    ValidationPatterns.URL.test(value) ? null : "Invalid URL format",
    
  futureTimestamp: (value: string) => {
    const date = new Date(value);
    return date.getTime() > Date.now() ? null : "Timestamp must be in the future";
  },
};

/**
 * Request size validation middleware
 */
export function validateRequestSize(request: Request, maxBytes: number = 1024 * 1024): APIError | null {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxBytes) {
    return {
      code: APIErrorCode.VALIDATION_ERROR,
      message: `Request too large. Maximum size: ${maxBytes} bytes`,
    };
  }
  return null;
}