/**
 * Enhanced type definitions for bankr-signals platform
 */

// Core signal types
export enum SignalAction {
  BUY = "BUY",
  SELL = "SELL", 
  LONG = "LONG",
  SHORT = "SHORT",
  HOLD = "HOLD",
}

export enum SignalStatus {
  OPEN = "open",
  CLOSED = "closed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  STOPPED = "stopped", // Hit stop loss
  PARTIAL = "partial", // Partially filled
}

export enum SignalCategory {
  SPOT = "spot",
  FUTURES = "futures", 
  OPTIONS = "options",
  DeFi = "defi",
  NFT = "nft",
  MACRO = "macro",
  SWING = "swing",
  SCALP = "scalp",
  ARBITRAGE = "arbitrage",
}

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  EXTREME = "extreme",
}

export enum TimeFrame {
  M1 = "1m",
  M5 = "5m",
  M15 = "15m",
  M30 = "30m",
  H1 = "1h",
  H4 = "4h",
  D1 = "1d",
  W1 = "1w",
  MN1 = "1M",
}

// Enhanced signal interface
export interface Signal {
  // Core fields (existing)
  id: string;
  provider: string;
  timestamp: string;
  action: SignalAction;
  token: string;
  chain: string;
  entryPrice: number;
  leverage?: number;
  confidence?: number;
  reasoning?: string;
  txHash?: string;
  stopLossPct?: number;
  takeProfitPct?: number;
  collateralUsd: number;
  status: SignalStatus;
  exitPrice?: number;
  exitTimestamp?: string;
  pnlPct?: number;
  pnlUsd?: number;
  exitTxHash?: string;
  
  // Enhanced fields (new)
  category: SignalCategory;
  riskLevel: RiskLevel;
  timeFrame: TimeFrame;
  tags: string[];
  expiresAt?: string;
  
  // Risk management
  maxDrawdownPct?: number;
  positionSize?: number; // As percentage of portfolio
  riskRewardRatio?: number;
  
  // Performance tracking
  roi?: number;
  holdingHours?: number;
  slippagePct?: number;
  feesUsd?: number;
  
  // Relationships
  parentSignalId?: string; // For follow-up signals
  relatedSignalIds?: string[];
  signalChainId?: string; // Group related signals
  
  // Market conditions
  marketCondition?: 'bullish' | 'bearish' | 'sideways' | 'volatile';
  volumeProfile?: 'high' | 'medium' | 'low';
  
  // Technical analysis
  technicalIndicators?: TechnicalIndicator[];
  supportLevel?: number;
  resistanceLevel?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number; // For signal amendments
}

export interface TechnicalIndicator {
  name: string;
  timeFrame: TimeFrame;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
}

// Provider enhancements
export enum ProviderTier {
  BASIC = "basic",
  VERIFIED = "verified", 
  PREMIUM = "premium",
  INSTITUTIONAL = "institutional",
}

export interface Provider {
  // Core fields (existing)
  address: string;
  name: string;
  bio?: string;
  description?: string;
  avatar?: string;
  chain: string;
  agent?: string;
  website?: string;
  twitter?: string;
  farcaster?: string;
  github?: string;
  registeredAt: string;
  
  // Enhanced fields (new)
  tier: ProviderTier;
  verified: boolean;
  verificationLevel: number; // 0-100
  reputation: number; // 0-1000
  followers: number;
  following: number;
  
  // Subscription model
  subscriptionFee?: number; // USD per month
  freeSignalsPerMonth?: number;
  
  // Performance metrics
  totalSignals: number;
  activeSignals: number;
  winRate: number;
  avgROI: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  profitFactor?: number;
  
  // Specialization
  specialties: SignalCategory[];
  preferredTimeFrames: TimeFrame[];
  averageHoldTime: number; // hours
  
  // Social proof
  testimonials?: Testimonial[];
  badges?: Badge[];
  
  // Activity
  lastSignalAt?: string;
  avgSignalsPerWeek: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  userId: string;
  userName: string;
  text: string;
  rating: number; // 1-5
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: string;
  criteria: string;
}

// Portfolio & Position Management
export interface Position {
  id: string;
  signalId: string;
  userId: string;
  entryPrice: number;
  quantity: number;
  currentPrice?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
}

export interface Portfolio {
  userId: string;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: Position[];
  followedProviders: string[];
  riskAllocation: Record<RiskLevel, number>; // Percentage per risk level
  updatedAt: string;
}

// Analytics & Reporting
export interface SignalAnalytics {
  signalId: string;
  views: number;
  followers: number;
  copiers: number;
  avgCopySize: number;
  sentimentScore: number; // -1 to 1
  marketImpact?: number;
  createdAt: string;
}

export interface ProviderAnalytics {
  providerId: string;
  period: string; // '1d', '7d', '30d', '90d', '1y'
  
  // Performance
  winRate: number;
  avgROI: number;
  totalPnl: number;
  bestSignal: string;
  worstSignal: string;
  
  // Activity
  signalCount: number;
  avgSignalsPerWeek: number;
  consistencyScore: number; // How regular their signals are
  
  // Following
  newFollowers: number;
  followerChurn: number;
  engagementRate: number;
  
  // Risk metrics
  maxDrawdown: number;
  volatility: number;
  sharpeRatio?: number;
  
  updatedAt: string;
}

// Webhook enhancements
export interface Webhook {
  id: string;
  url: string;
  active: boolean;
  
  // Filters
  providerFilter?: string;
  tokenFilter?: string;
  categoryFilter?: SignalCategory;
  riskLevelFilter?: RiskLevel;
  minConfidence?: number;
  minCollateralUsd?: number;
  
  // Delivery options
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
  
  // Stats
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
  
  createdAt: string;
  updatedAt: string;
}

// Market data
export interface MarketData {
  token: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  volatility: number;
  updatedAt: string;
}

// Signal feed enhancements
export interface SignalFeed {
  signals: Signal[];
  providers: Provider[];
  analytics: {
    totalSignals: number;
    activeProviders: number;
    avgWinRate: number;
    topPerformingTokens: string[];
    trendingCategories: SignalCategory[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  lastUpdated: string;
}

// API Request/Response types
export interface SubmitSignalRequest {
  action: SignalAction;
  token: string;
  entryPrice: number;
  collateralUsd: number;
  chain?: string;
  leverage?: number;
  confidence?: number;
  reasoning?: string;
  txHash: string;
  stopLossPct?: number;
  takeProfitPct?: number;
  
  // Enhanced fields
  category: SignalCategory;
  riskLevel?: RiskLevel;
  timeFrame?: TimeFrame;
  tags?: string[];
  expiresAt?: string;
  positionSize?: number;
  riskRewardRatio?: number;
  technicalIndicators?: TechnicalIndicator[];
  
  // Required authentication
  message: string;
  signature: string;
}

export interface RegisterProviderRequest {
  address: string;
  name: string;
  bio?: string;
  description?: string;
  avatar?: string;
  chain?: string;
  agent?: string;
  website?: string;
  twitter?: string;
  farcaster?: string;
  github?: string;
  
  // Enhanced fields
  specialties?: SignalCategory[];
  subscriptionFee?: number;
  freeSignalsPerMonth?: number;
  
  // Required authentication
  message: string;
  signature: string;
}

// Leaderboard enhancements
export interface LeaderboardEntry extends Provider {
  rank: number;
  rankChange: number; // vs previous period
  score: number; // Composite score
  recentPerformance: {
    winRate7d: number;
    roi7d: number;
    signalCount7d: number;
  };
}