import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

interface MonitoringStats {
  total_providers: number;
  active_providers: number;
  inactive_providers: number;
  never_published: number;
  recent_registrations: number;
  health_score: number;
  issues: string[];
  recommendations: string[];
}

export async function GET() {
  try {
    // Get provider counts
    const { data: allProviders, error: providersError } = await supabase
      .from('signal_providers')
      .select('address, name, registered_at, total_signals')
      .order('registered_at', { ascending: false });

    if (providersError) {
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const totalProviders = allProviders?.length || 0;
    const activeProviders = allProviders?.filter(p => p.total_signals > 0).length || 0;
    const inactiveProviders = totalProviders - activeProviders;
    const neverPublished = allProviders?.filter(p => p.total_signals === 0).length || 0;
    const recentRegistrations = allProviders?.filter(p => 
      new Date(p.registered_at) > sevenDaysAgo
    ).length || 0;

    // Calculate health score (0-100)
    let healthScore = 100;
    const activationRate = totalProviders > 0 ? (activeProviders / totalProviders) * 100 : 0;
    
    // Deduct points based on issues
    if (activationRate < 30) healthScore -= 30; // Less than 30% activation is critical
    else if (activationRate < 50) healthScore -= 15; // Less than 50% activation is concerning
    
    if (neverPublished > 15) healthScore -= 20; // Too many inactive providers
    else if (neverPublished > 10) healthScore -= 10;
    
    if (recentRegistrations === 0) healthScore -= 10; // No recent growth

    // Identify issues
    const issues: string[] = [];
    if (activationRate < 30) {
      issues.push(`Critical: Only ${activationRate.toFixed(1)}% of providers are active (< 30%)`);
    } else if (activationRate < 50) {
      issues.push(`Low activation rate: ${activationRate.toFixed(1)}% of providers are active`);
    }
    
    if (neverPublished > 15) {
      issues.push(`${neverPublished} providers registered but never published (high drop-off)`);
    }
    
    if (recentRegistrations === 0) {
      issues.push('No new registrations in the last 7 days');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (neverPublished > 5) {
      recommendations.push('Create onboarding outreach campaign for inactive providers');
      recommendations.push('Simplify the first signal publication process');
      recommendations.push('Add more troubleshooting resources to the registration wizard');
    }
    
    if (activationRate < 50) {
      recommendations.push('Launch targeted agent onboarding campaign');
      recommendations.push('Create agent success stories / case studies');
      recommendations.push('Improve skill.md documentation with more examples');
    }
    
    if (recentRegistrations < 3) {
      recommendations.push('Increase social media outreach to agent communities');
      recommendations.push('Submit bankr-signals skill to agent repositories');
      recommendations.push('Create referral program for existing providers');
    }

    const stats: MonitoringStats = {
      total_providers: totalProviders,
      active_providers: activeProviders,
      inactive_providers: inactiveProviders,
      never_published: neverPublished,
      recent_registrations: recentRegistrations,
      health_score: Math.max(0, healthScore),
      issues,
      recommendations
    };

    // Get recent signals for additional context
    const { data: recentSignals } = await supabase
      .from('signals')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    const recentSignalCount = recentSignals?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        recent_signals: recentSignalCount,
        activation_rate: activationRate,
        last_updated: now.toISOString(),
        detailed_breakdown: {
          providers_by_signals: allProviders?.reduce((acc: Record<string, number>, p) => {
            const bucket = p.total_signals === 0 ? '0' : 
                          p.total_signals < 5 ? '1-4' :
                          p.total_signals < 10 ? '5-9' :
                          p.total_signals < 20 ? '10-19' : '20+';
            acc[bucket] = (acc[bucket] || 0) + 1;
            return acc;
          }, {}),
          registration_timeline: allProviders?.reduce((acc: Record<string, number>, p) => {
            const date = new Date(p.registered_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error('Error in monitoring overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}