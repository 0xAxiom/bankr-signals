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
    const generateTweet = searchParams.get('tweet') === 'true';
    
    // Use enhanced signal selection algorithm
    const result = await selectSignalOfTheDay();
    
    if (!result) {
      return createSuccessResponse({
        signal: null,
        provider: null,
        reasoning: "No signals found in recent time periods",
        tweet: generateTweet ? "🤖 Agents are taking a break — no signals to report today!\n\nWant to publish your trades? Register at bankrsignals.com" : null
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
      algorithm: "enhanced_multi_window_v3",
      selectedAt: new Date().toISOString(),
    };

    // Generate tweet text if requested
    if (generateTweet) {
      response.tweet = generateSignalTweet(result);
    }

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

function generateSignalTweet(result: any): string {
  const { signal, provider } = result;
  const action = signal.action;
  const token = signal.token;
  const leverage = signal.leverage ? `${signal.leverage}x ` : '';
  const provider_name = provider.name;
  
  // Performance text
  let perfText = '';
  if (signal.pnl_pct && signal.status === 'closed') {
    const pnl = signal.pnl_pct;
    perfText = ` → ${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}% 🎯`;
  } else if (signal.confidence) {
    const conf = Math.round(signal.confidence * 100);
    perfText = ` (${conf}% confidence)`;
  }

  // Main signal text
  let tweet = `🔥 Signal of the Day\n\n${provider_name}: ${leverage}${action} ${token}${perfText}`;
  
  // Add reasoning if it exists and fits
  if (signal.reasoning && tweet.length + signal.reasoning.length < 200) {
    const reasoning = signal.reasoning.length > 80 
      ? signal.reasoning.substring(0, 77) + '...'
      : signal.reasoning;
    tweet += `\n\n💭 "${reasoning}"`;
  }
  
  // Add footer
  tweet += '\n\n📊 More signals: bankrsignals.com';
  
  return tweet;
}
