import { NextResponse } from 'next/server';
import { mockProviders } from '@/lib/mock-data';

// Helper to get inactive providers - works with both live and mock data
async function getInactiveProviders() {
  try {
    // For production, this would use Supabase
    // For development, use mock data
    const providers = mockProviders;
    
    return providers.filter(provider => provider.total_signals === 0);
  } catch (error) {
    console.error('Error fetching providers:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const inactiveProviders = await getInactiveProviders();

    // Calculate days since registration
    const enrichedProviders = inactiveProviders.map(provider => {
      const registeredAt = new Date(provider.registered_at);
      const daysSinceRegistration = Math.floor(
        (Date.now() - registeredAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        ...provider,
        days_since_registration: daysSinceRegistration,
        needs_activation: daysSinceRegistration >= 1 // Consider activation needed after 1 day
      };
    });

    const activationCandidates = enrichedProviders.filter(p => p.needs_activation);

    return NextResponse.json({
      total_inactive: inactiveProviders.length,
      activation_candidates: activationCandidates.length,
      providers: enrichedProviders,
      stats: {
        registered_today: enrichedProviders.filter(p => p.days_since_registration === 0).length,
        registered_this_week: enrichedProviders.filter(p => p.days_since_registration <= 7).length,
        old_inactive: enrichedProviders.filter(p => p.days_since_registration > 7).length
      }
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}