/**
 * Constants for the bankr-signals API
 */

// Provider addresses (lowercase for DB consistency)
export const PROVIDER_ADDRESSES = {
  AXIOM: '0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5',
  // Add other known provider addresses here
} as const;

// Enhanced validation constants
export const VALIDATION_LIMITS = {
  MAX_TAGS: 10,
  MAX_REASONING_LENGTH: 1000,
  MAX_BIO_LENGTH: 280,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_COLLATERAL_USD: 1,
  MAX_COLLATERAL_USD: 1000000,
  MIN_LEVERAGE: 1,
  MAX_LEVERAGE: 100,
  MIN_CONFIDENCE: 0,
  MAX_CONFIDENCE: 1,
  MIN_STOP_LOSS_PCT: 0.1,
  MAX_STOP_LOSS_PCT: 90,
  MIN_TAKE_PROFIT_PCT: 0.1,
  MAX_TAKE_PROFIT_PCT: 1000,
} as const;

// Signal expiry defaults by category (in days)
export const CATEGORY_EXPIRY_DAYS = {
  scalp: 1,
  swing: 7,
  spot: 3,
  futures: 30,
  options: 14,
  defi: 14,
  macro: 90,
  arbitrage: 1,
  nft: 7,
} as const;

// Time frame multipliers for expiry calculation
export const TIMEFRAME_MULTIPLIERS = {
  '1m': 0.1,
  '5m': 0.2,
  '15m': 0.5,
  '30m': 0.8,
  '1h': 1,
  '4h': 2,
  '1d': 3,
  '1w': 7,
  '1M': 30,
} as const;

// Provider tier multipliers for rate limits
export const TIER_MULTIPLIERS = {
  basic: 1,
  verified: 2,
  premium: 5,
  institutional: 10,
} as const;

// Webhook configuration
export const WEBHOOK_DEFAULTS = {
  TIMEOUT_MS: 10000,
  MAX_FAILURES: 10,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// Auto-close detection thresholds
export const AUTO_CLOSE_THRESHOLDS = {
  MAX_DRAWDOWN_PCT: 25,
  QUICK_CLOSE_MINUTES: 15,
  MAX_QUICK_CLOSES_PER_HOUR: 10,
} as const;

// Blockchain configuration
export const BLOCKCHAIN_CONFIG = {
  BASE_CHAIN_ID: 8453,
  BASE_RPC_URLS: [
    'https://mainnet.base.org',
    'https://base-mainnet.blastapi.io/public',
    'https://base.publicnode.com',
  ],
  TX_CONFIRMATION_BLOCKS: 1,
  TX_TIMEOUT_MS: 30000,
} as const;

// API versioning
export const API_VERSION = '2.0-enhanced';
export const SUPPORTED_VERSIONS = ['1.0', '2.0', '2.0-enhanced'] as const;

// Enhanced error messages
export const ERROR_MESSAGES = {
  COLLATERAL_REQUIRED: 'collateralUsd is required and must be at least $1',
  PROVIDER_NOT_REGISTERED: 'Provider not registered. Register at /api/providers/register first',
  SIGNATURE_INVALID: 'Invalid signature - must be signed by the provider',
  TX_NOT_FOUND: 'Transaction not found onchain - submit a valid transaction hash',
  SIGNAL_NOT_OPEN: 'Signal is not in open status',
  DUPLICATE_SIGNAL: 'Potential duplicate signal detected',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded - please wait before retrying',
  SUSPICIOUS_ACTIVITY: 'Suspicious activity detected - request blocked',
} as const;