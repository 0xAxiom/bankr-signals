/**
 * Enhanced provider verification and reputation system
 */

import { supabase } from "./db";
import { ValidationPatterns } from "./api-utils";
import { ProviderTier } from "./types";

export interface VerificationCheck {
  type: 'social' | 'onchain' | 'performance' | 'kyc';
  status: 'pending' | 'passed' | 'failed';
  score: number; // 0-100
  details?: Record<string, any>;
  verifiedAt?: string;
}

export interface ProviderVerification {
  address: string;
  overallScore: number; // 0-100
  tier: ProviderTier;
  verified: boolean;
  checks: VerificationCheck[];
  badges: string[];
  lastUpdated: string;
}

/**
 * Calculate provider verification score and tier
 */
export async function calculateProviderVerification(address: string): Promise<ProviderVerification> {
  try {
    const checks: VerificationCheck[] = [];

    // 1. Social Media Verification (0-25 points)
    const socialCheck = await verifySocialMedia(address);
    checks.push(socialCheck);

    // 2. On-chain Activity Verification (0-30 points)
    const onchainCheck = await verifyOnchainActivity(address);
    checks.push(onchainCheck);

    // 3. Performance Track Record (0-35 points)
    const performanceCheck = await verifyPerformanceHistory(address);
    checks.push(performanceCheck);

    // 4. KYC/Identity Verification (0-10 points) - placeholder
    const kycCheck: VerificationCheck = {
      type: 'kyc',
      status: 'pending',
      score: 0,
      details: { note: 'Manual verification required' }
    };
    checks.push(kycCheck);

    // Calculate overall score
    const overallScore = checks.reduce((sum, check) => sum + check.score, 0);
    
    // Determine tier based on score
    const tier = calculateTier(overallScore, checks);
    
    // Determine if fully verified
    const verified = overallScore >= 60 && checks.filter(c => c.status === 'passed').length >= 2;

    // Award badges based on achievements
    const badges = calculateBadges(checks, overallScore);

    return {
      address,
      overallScore,
      tier,
      verified,
      checks,
      badges,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error calculating provider verification:", error);
    
    return {
      address,
      overallScore: 0,
      tier: ProviderTier.BASIC,
      verified: false,
      checks: [],
      badges: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Verify social media presence and authenticity
 */
async function verifySocialMedia(address: string): Promise<VerificationCheck> {
  try {
    const { data: provider } = await supabase
      .from("signal_providers")
      .select("twitter, farcaster, github, website")
      .ilike("address", address)
      .single();

    if (!provider) {
      return {
        type: 'social',
        status: 'failed',
        score: 0,
        details: { error: 'Provider not found' }
      };
    }

    let score = 0;
    const details: Record<string, any> = {};

    // Twitter verification
    if (provider.twitter) {
      try {
        // In a real implementation, you'd check Twitter API or use a service
        // For now, just award points for having the field
        score += 8;
        details.twitter = 'handle_provided';
        
        // TODO: Implement actual Twitter verification:
        // - Check if handle exists
        // - Check follower count
        // - Check if they've mentioned their wallet address
        // - Check account age
      } catch (error) {
        details.twitter_error = error;
      }
    }

    // Farcaster verification  
    if (provider.farcaster) {
      try {
        score += 6;
        details.farcaster = 'handle_provided';
        
        // TODO: Implement Farcaster verification via Neynar API
      } catch (error) {
        details.farcaster_error = error;
      }
    }

    // GitHub verification
    if (provider.github) {
      try {
        score += 5;
        details.github = 'handle_provided';
        
        // TODO: Check GitHub profile and contribution history
      } catch (error) {
        details.github_error = error;
      }
    }

    // Website verification
    if (provider.website) {
      try {
        const response = await fetch(provider.website, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          score += 6;
          details.website = 'accessible';
          
          // TODO: Check if website mentions the wallet address
        } else {
          details.website = 'not_accessible';
        }
      } catch (error) {
        details.website_error = 'failed_to_access';
      }
    }

    const status = score > 15 ? 'passed' : score > 8 ? 'pending' : 'failed';

    return {
      type: 'social',
      status,
      score,
      details,
      verifiedAt: status === 'passed' ? new Date().toISOString() : undefined
    };
  } catch (error) {
    return {
      type: 'social',
      status: 'failed',
      score: 0,
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Verify on-chain activity and wallet authenticity
 */
async function verifyOnchainActivity(address: string): Promise<VerificationCheck> {
  try {
    const details: Record<string, any> = {};
    let score = 0;

    // Check transaction history on Base
    const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
    
    // Get transaction count
    const txCountResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionCount",
        params: [address, "latest"]
      }),
      signal: AbortSignal.timeout(10000)
    });

    const txCountData = await txCountResponse.json();
    const txCount = parseInt(txCountData.result || "0", 16);
    
    details.transaction_count = txCount;

    // Score based on transaction history
    if (txCount > 1000) score += 15;
    else if (txCount > 500) score += 12;
    else if (txCount > 100) score += 10;
    else if (txCount > 50) score += 7;
    else if (txCount > 10) score += 4;
    else if (txCount > 1) score += 2;

    // Check ETH balance
    const balanceResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_getBalance",
        params: [address, "latest"]
      }),
      signal: AbortSignal.timeout(10000)
    });

    const balanceData = await balanceResponse.json();
    const balanceWei = parseInt(balanceData.result || "0", 16);
    const balanceEth = balanceWei / 1e18;
    
    details.balance_eth = balanceEth;

    // Score based on balance (indicates serious trader)
    if (balanceEth > 10) score += 10;
    else if (balanceEth > 1) score += 7;
    else if (balanceEth > 0.1) score += 4;
    else if (balanceEth > 0.01) score += 2;

    // Check if address has submitted signals (trading activity on platform)
    const { data: signals } = await supabase
      .from("signals")
      .select("id")
      .ilike("provider", address);

    const signalCount = signals?.length || 0;
    details.platform_signals = signalCount;

    // Score for platform activity
    if (signalCount > 50) score += 5;
    else if (signalCount > 20) score += 3;
    else if (signalCount > 5) score += 2;
    else if (signalCount > 0) score += 1;

    const status = score > 20 ? 'passed' : score > 10 ? 'pending' : 'failed';

    return {
      type: 'onchain',
      status,
      score,
      details,
      verifiedAt: status === 'passed' ? new Date().toISOString() : undefined
    };
  } catch (error) {
    return {
      type: 'onchain',
      status: 'failed',
      score: 0,
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Verify trading performance and track record
 */
async function verifyPerformanceHistory(address: string): Promise<VerificationCheck> {
  try {
    const { data: signals } = await supabase
      .from("signals")
      .select("*")
      .ilike("provider", address)
      .order("timestamp", { ascending: false });

    if (!signals || signals.length === 0) {
      return {
        type: 'performance',
        status: 'failed',
        score: 0,
        details: { error: 'No trading history found' }
      };
    }

    let score = 0;
    const details: Record<string, any> = {};

    const totalSignals = signals.length;
    const closedSignals = signals.filter(s => s.status === 'closed' && s.pnl_pct !== null);
    const winningSignals = closedSignals.filter(s => s.pnl_pct > 0);
    
    details.total_signals = totalSignals;
    details.closed_signals = closedSignals.length;
    details.winning_signals = winningSignals.length;

    // Score for track record size
    if (totalSignals > 100) score += 10;
    else if (totalSignals > 50) score += 8;
    else if (totalSignals > 20) score += 6;
    else if (totalSignals > 10) score += 4;
    else if (totalSignals > 5) score += 2;

    if (closedSignals.length > 0) {
      const winRate = (winningSignals.length / closedSignals.length) * 100;
      details.win_rate = winRate;

      // Score for win rate
      if (winRate >= 80) score += 15;
      else if (winRate >= 70) score += 12;
      else if (winRate >= 60) score += 10;
      else if (winRate >= 50) score += 7;
      else if (winRate >= 40) score += 4;
      else score -= 2; // Penalty for poor win rate

      // Calculate average return
      const totalPnl = closedSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0);
      const avgReturn = totalPnl / closedSignals.length;
      details.average_return = avgReturn;

      // Score for average return
      if (avgReturn >= 10) score += 10;
      else if (avgReturn >= 5) score += 7;
      else if (avgReturn >= 2) score += 5;
      else if (avgReturn >= 0) score += 2;
      else score -= 3; // Penalty for negative average

      // Calculate consistency (standard deviation of returns)
      const returns = closedSignals.map(s => s.pnl_pct || 0);
      const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
      details.consistency_score = 100 - Math.min(100, stdDev * 2); // Lower std dev = higher consistency

      if (stdDev < 10) score += 5; // Bonus for consistency
    }

    // Check for recent activity
    const recentSignals = signals.filter(s => {
      const signalAge = Date.now() - new Date(s.timestamp).getTime();
      return signalAge < 30 * 24 * 60 * 60 * 1000; // Last 30 days
    });

    details.recent_signals = recentSignals.length;
    
    if (recentSignals.length > 10) score += 3;
    else if (recentSignals.length > 5) score += 2;
    else if (recentSignals.length > 0) score += 1;

    const status = score > 25 ? 'passed' : score > 15 ? 'pending' : 'failed';

    return {
      type: 'performance',
      status,
      score,
      details,
      verifiedAt: status === 'passed' ? new Date().toISOString() : undefined
    };
  } catch (error) {
    return {
      type: 'performance',
      status: 'failed',
      score: 0,
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Calculate provider tier based on verification score
 */
function calculateTier(overallScore: number, checks: VerificationCheck[]): ProviderTier {
  const passedChecks = checks.filter(c => c.status === 'passed').length;
  
  if (overallScore >= 80 && passedChecks >= 3) {
    return ProviderTier.INSTITUTIONAL;
  } else if (overallScore >= 60 && passedChecks >= 2) {
    return ProviderTier.PREMIUM;
  } else if (overallScore >= 40 && passedChecks >= 1) {
    return ProviderTier.VERIFIED;
  } else {
    return ProviderTier.BASIC;
  }
}

/**
 * Calculate badges based on achievements
 */
function calculateBadges(checks: VerificationCheck[], overallScore: number): string[] {
  const badges: string[] = [];

  // Social media badges
  const socialCheck = checks.find(c => c.type === 'social');
  if (socialCheck?.status === 'passed' && socialCheck.score > 20) {
    badges.push('social_verified');
  }

  // On-chain activity badges
  const onchainCheck = checks.find(c => c.type === 'onchain');
  if (onchainCheck?.details?.transaction_count > 1000) {
    badges.push('whale_trader');
  } else if (onchainCheck?.details?.transaction_count > 100) {
    badges.push('active_trader');
  }

  // Performance badges
  const perfCheck = checks.find(c => c.type === 'performance');
  if (perfCheck?.details?.win_rate >= 80) {
    badges.push('high_accuracy');
  }
  if (perfCheck?.details?.average_return >= 10) {
    badges.push('high_returns');
  }
  if (perfCheck?.details?.total_signals >= 100) {
    badges.push('experienced');
  }
  if (perfCheck?.details?.consistency_score >= 80) {
    badges.push('consistent');
  }

  // Overall achievement badges
  if (overallScore >= 90) {
    badges.push('top_tier');
  } else if (overallScore >= 70) {
    badges.push('verified_trader');
  }

  return badges;
}

/**
 * Update provider verification in database
 */
export async function updateProviderVerification(verification: ProviderVerification): Promise<void> {
  try {
    await supabase
      .from("signal_providers")
      .update({
        verified: verification.verified,
        verification_level: verification.overallScore,
        tier: verification.tier,
        reputation: Math.min(1000, verification.overallScore * 10), // Scale to 0-1000
        badges: verification.badges,
        verification_data: {
          checks: verification.checks,
          last_updated: verification.lastUpdated,
        },
        updated_at: new Date().toISOString(),
      })
      .ilike("address", verification.address);
  } catch (error) {
    console.error("Error updating provider verification:", error);
  }
}

/**
 * Get verification requirements for each tier
 */
export function getVerificationRequirements(): Record<ProviderTier, string[]> {
  return {
    [ProviderTier.BASIC]: [
      "Valid Ethereum address",
      "Platform registration"
    ],
    [ProviderTier.VERIFIED]: [
      "Social media verification",
      "On-chain activity history",
      "Minimum 5 signals with 50%+ win rate"
    ],
    [ProviderTier.PREMIUM]: [
      "All VERIFIED requirements",
      "20+ closed signals",
      "60%+ win rate",
      "Positive average returns",
      "Active in last 30 days"
    ],
    [ProviderTier.INSTITUTIONAL]: [
      "All PREMIUM requirements", 
      "50+ closed signals",
      "70%+ win rate",
      "5%+ average returns",
      "Consistent performance",
      "Manual review approved"
    ]
  };
}