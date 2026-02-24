import { NextResponse } from 'next/server';
import { selectSignalOfTheDay, getTrendingSignalsByCategory } from '@/lib/signal-selector';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  APIErrorCode, 
  dbToApiSignal, 
  dbToApiProvider 
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeTrending = searchParams.get('trending') === 'true';
    
    // Use enhanced signal selection algorithm
    const result = await selectSignalOfTheDay();
    
    if (!result) {
      return createSuccessResponse({
        signal: null,
        provider: null,
        reasoning: "No signals found in the last 7 days"
      });
    }

    const response: any = {
      signal: {
        ...dbToApiSignal(result.signal),
        score: result.score.score,
        scoreBreakdown: result.score.breakdown,
      },
      provider: dbToApiProvider(result.provider),
      reasoning: result.reasoning,
      algorithm: "multi_factor_scoring_v2",
      selectedAt: new Date().toISOString(),
    };

    // Optionally include trending signals by category
    if (includeTrending) {
      const trending = await getTrendingSignalsByCategory(24);
      response.trending = trending;
    }

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error('Signal of day error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to load signal of the day',
      500
    );
  }
}
