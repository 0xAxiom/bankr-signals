/**
 * Daily tweet automation cron job
 * Posts "Signal of the Day" and other engagement content to Twitter
 * Should run once daily at a strategic time (e.g., 9 AM PT)
 */

import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = "force-dynamic";

interface TweetResult {
  success: boolean;
  tweetUrl?: string;
  error?: string;
  text?: string;
}

async function postTweet(text: string): Promise<TweetResult> {
  try {
    // Initialize Twitter API client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY!,
      appSecret: process.env.TWITTER_CONSUMER_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });

    // Post the tweet
    const tweet = await client.v2.tweet(text);
    
    // Construct tweet URL
    const tweetUrl = `https://x.com/AxiomBot/status/${tweet.data.id}`;
    
    return {
      success: true,
      tweetUrl: tweetUrl,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    };
  } catch (error: any) {
    console.error('Twitter API error:', error);
    return {
      success: false,
      error: error.message,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    };
  }
}

async function getTweetDraft(): Promise<{ text: string; type: string } | null> {
  try {
    // Get draft from our tweet-draft API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bankrsignals.com'}/api/content/tweet-draft?type=auto`);
    
    if (!response.ok) {
      throw new Error(`Tweet draft API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data.draft) {
      return {
        text: data.data.draft.text,
        type: data.data.draft.type,
      };
    }
    
    return null;
  } catch (error: any) {
    console.error('Failed to get tweet draft:', error);
    return null;
  }
}

function getFallbackTweet(): { text: string; type: string } {
  const fallbacks = [
    {
      text: "🤖 Trading agents are building track records onchain\n\nEvery signal backed by transaction hashes\nNo fake results, no cherry picking\n\nSee who's actually profitable: bankrsignals.com",
      type: "brand_message"
    },
    {
      text: "📊 Transparent Trading Intelligence\n\n✅ Transaction-verified signals\n✅ Real-time PnL tracking\n✅ Public leaderboards\n✅ Copy-tradeable strategies\n\nWatch the best agents: bankrsignals.com",
      type: "features_highlight"
    },
    {
      text: "🎯 Why agent trading signals matter:\n\n• No emotions, pure data\n• 24/7 market monitoring\n• Backtested strategies\n• Transparent performance\n\nThe future of trading is here: bankrsignals.com",
      type: "value_proposition"
    }
  ];
  
  // Rotate through fallbacks based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return fallbacks[dayOfYear % fallbacks.length];
}

export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    console.log("Starting daily tweet job...");

    // Try to get a content-based tweet first
    let tweet = await getTweetDraft();
    
    // Fall back to brand message if no content available
    if (!tweet) {
      tweet = getFallbackTweet();
      console.log("Using fallback tweet:", tweet.type);
    } else {
      console.log("Using generated tweet:", tweet.type);
    }

    // Post the tweet
    const result = await postTweet(tweet.text);

    const executionTime = Date.now() - startTime;

    const response = {
      success: result.success,
      tweet: {
        text: result.text,
        type: tweet.type,
        url: result.tweetUrl,
        error: result.error,
      },
      stats: {
        executionTimeMs: executionTime,
        usedFallback: !await getTweetDraft(),
      },
      timestamp: new Date().toISOString(),
    };

    if (result.success) {
      console.log("Daily tweet job completed successfully:", {
        type: tweet.type,
        url: result.tweetUrl,
        executionTime,
      });
    } else {
      console.error("Daily tweet job failed:", result.error);
    }

    return NextResponse.json(response, {
      status: result.success ? 200 : 500
    });

  } catch (error: any) {
    console.error("Daily tweet job error:", error);
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

// GET endpoint for manual testing and info
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const test = searchParams.get('test');
  const preview = searchParams.get('preview');
  
  if (test === 'true') {
    // Allow manual testing without posting
    console.log("Running daily tweet job in test mode (no actual posting)...");
    
    const tweet = await getTweetDraft() || getFallbackTweet();
    
    return NextResponse.json({
      success: true,
      mode: "test",
      tweet: {
        text: tweet.text,
        type: tweet.type,
        length: tweet.text.length,
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  if (preview === 'true') {
    // Just show what would be tweeted
    const tweet = await getTweetDraft() || getFallbackTweet();
    
    return NextResponse.json({
      preview: tweet.text,
      type: tweet.type,
      length: tweet.text.length,
      charactersRemaining: 280 - tweet.text.length,
    });
  }
  
  return NextResponse.json({
    message: "Daily tweet automation cron endpoint",
    usage: "POST with proper authorization header",
    testUrl: "/api/cron/daily-tweet?test=true",
    previewUrl: "/api/cron/daily-tweet?preview=true",
    schedule: "Once daily at 9 AM PT",
    features: [
      "Signal of the day tweets",
      "Performance highlights", 
      "Market insights",
      "Fallback brand messages",
    ]
  });
}