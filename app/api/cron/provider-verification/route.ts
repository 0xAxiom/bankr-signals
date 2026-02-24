/**
 * Background job for provider verification maintenance
 * Call this endpoint periodically (daily) to:
 * - Update verification scores for all providers
 * - Recalculate tiers and badges
 * - Update reputation scores
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { 
  calculateProviderVerification, 
  updateProviderVerification 
} from "@/lib/provider-verification";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    console.log("Starting provider verification job...");

    // Get all providers
    const { data: providers, error } = await supabase
      .from("signal_providers")
      .select("address")
      .order("registered_at", { ascending: true });

    if (error || !providers) {
      throw new Error(`Failed to fetch providers: ${error?.message}`);
    }

    const results = {
      totalProviders: providers.length,
      updated: 0,
      errors: 0,
      tierChanges: {} as Record<string, number>,
      newlyVerified: 0,
    };

    // Process providers in batches to avoid overwhelming external APIs
    const batchSize = 10;
    for (let i = 0; i < providers.length; i += batchSize) {
      const batch = providers.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (provider) => {
          try {
            // Get current verification status
            const { data: currentProvider } = await supabase
              .from("signal_providers")
              .select("verified, tier")
              .eq("address", provider.address)
              .single();

            // Calculate new verification
            const verification = await calculateProviderVerification(provider.address);
            
            // Track tier changes
            if (currentProvider?.tier !== verification.tier) {
              results.tierChanges[verification.tier] = (results.tierChanges[verification.tier] || 0) + 1;
            }
            
            // Track newly verified providers
            if (!currentProvider?.verified && verification.verified) {
              results.newlyVerified++;
            }

            // Update verification in database
            await updateProviderVerification(verification);
            results.updated++;
            
          } catch (error) {
            console.error(`Error updating verification for ${provider.address}:`, error);
            results.errors++;
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < providers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const executionTime = Date.now() - startTime;

    const result = {
      success: true,
      stats: results,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString(),
    };

    console.log("Provider verification job completed:", results);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Provider verification job error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
      }, 
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const test = searchParams.get('test');
  const address = searchParams.get('address');
  
  if (test === 'true' && address) {
    // Test single provider verification
    try {
      const verification = await calculateProviderVerification(address);
      return NextResponse.json({
        address,
        verification,
        message: "Test verification calculation (not saved)",
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
  
  return NextResponse.json({
    message: "Provider verification maintenance endpoint",
    usage: "POST with proper authorization header",
    testUrl: "/api/cron/provider-verification?test=true&address=0x...",
  });
}