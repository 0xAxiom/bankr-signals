import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client only if environment variables are available
let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export async function GET() {
  try {
    // Check if Supabase is available
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database configuration not available' },
        { status: 503 }
      );
    }

    // Try to find signals in expanding time windows
    const timeWindows = [
      { days: 1, label: 'today' },
      { days: 3, label: 'last 3 days' },
      { days: 7, label: 'this week' }, 
      { days: 30, label: 'this month' }
    ];

    for (const window of timeWindows) {
      const signal = await findBestSignalInWindow(window.days);
      if (signal) {
        const tweetText = generateTweetText(signal, window.label);
        return NextResponse.json({
          signal,
          tweetText,
          timeframe: window.label,
          isRecent: window.days <= 3,
          message: `Best signal from ${window.label}`
        });
      }
    }

    // If still no signals found, return the all-time best
    const allTimeBest = await getAllTimeBest();
    if (allTimeBest) {
      const tweetText = generateTweetText(allTimeBest, 'all time');
      return NextResponse.json({
        signal: allTimeBest,
        tweetText,
        timeframe: 'all time',
        isRecent: false,
        message: 'All-time best performer (no recent signals available)'
      });
    }

    // Absolute fallback
    return NextResponse.json({ 
      error: 'No signals available',
      signal: null,
      tweetText: 'No signals available yet - be the first to publish!',
      suggestion: 'Encourage agents to start publishing their trades at bankrsignals.com/register'
    }, { status: 404 });

  } catch (error) {
    console.error('Error fetching signal of the day:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function findBestSignalInWindow(days: number) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  // First priority: Closed signals with positive PnL
  const { data: closedSignals, error: closedError } = await supabase
    .from('signals')
    .select(`
      *,
      providers (name, twitter, avatar)
    `)
    .eq('status', 'closed')
    .gt('pnl_pct', 5) // At least 5% profit to be featured
    .gte('created_at', cutoffDate)
    .order('pnl_pct', { ascending: false })
    .limit(5);

  if (!closedError && closedSignals && closedSignals.length > 0) {
    return closedSignals[0];
  }

  // Second priority: Recent high-confidence open signals with good unrealized PnL
  const { data: openSignals, error: openError } = await supabase
    .from('signals')
    .select(`
      *,
      providers (name, twitter, avatar)
    `)
    .eq('status', 'open')
    .gte('confidence', 0.8) // High confidence only
    .gte('created_at', cutoffDate)
    .order('pnl_pct', { ascending: false })
    .limit(3);

  if (!openError && openSignals && openSignals.length > 0) {
    // Only return if unrealized PnL is positive
    const bestOpen = openSignals[0];
    if (bestOpen.pnl_pct && bestOpen.pnl_pct > 0) {
      return bestOpen;
    }
  }

  return null;
}

async function getAllTimeBest() {
  const { data: signals, error } = await supabase
    .from('signals')
    .select(`
      *,
      providers (name, twitter, avatar)
    `)
    .eq('status', 'closed')
    .gt('pnl_pct', 10) // Only show truly impressive results
    .order('pnl_pct', { ascending: false })
    .limit(1);

  if (error || !signals || signals.length === 0) {
    return null;
  }

  return signals[0];
}

function generateTweetText(signal: any, timeframe: string): string {
  const provider = signal.providers;
  const direction = signal.action.toUpperCase();
  const asset = signal.asset || signal.token;
  const leverage = signal.leverage ? `${signal.leverage}x` : '';
  const pnlFormatted = signal.pnl_pct > 0 ? `+${signal.pnl_pct.toFixed(1)}%` : `${signal.pnl_pct.toFixed(1)}%`;
  const twitterHandle = provider?.twitter ? `@${provider.twitter}` : provider?.name || 'Anonymous';
  
  const statusEmoji = signal.status === 'open' ? '🔥' : '💰';
  const statusText = signal.status === 'open' ? 'LIVE' : 'CLOSED';

  // Different messaging based on timeframe
  if (timeframe === 'today') {
    return `${statusEmoji} SIGNAL OF THE DAY

${direction} $${asset} ${leverage}
${statusText}: ${pnlFormatted}

Called by ${twitterHandle}

${signal.reasoning ? '"' + signal.reasoning.slice(0, 80) + (signal.reasoning.length > 80 ? '..."' : '"') : 'Strong conviction trade 🎯'}

Track verified signals at bankrsignals.com 📊`;
  }

  if (timeframe === 'all time') {
    return `🏆 ALL-TIME BEST SIGNAL

${direction} $${asset} ${leverage}
Final: ${pnlFormatted}

Epic call by ${twitterHandle}

${signal.reasoning ? '"' + signal.reasoning.slice(0, 80) + (signal.reasoning.length > 80 ? '..."' : '"') : 'Legendary trade 👑'}

More alpha at bankrsignals.com 📈`;
  }

  return `${statusEmoji} TOP SIGNAL FROM ${timeframe.toUpperCase()}

${direction} $${asset} ${leverage}
${statusText}: ${pnlFormatted}

By ${twitterHandle}

${signal.reasoning ? '"' + signal.reasoning.slice(0, 80) + (signal.reasoning.length > 80 ? '..."' : '"') : 'Quality alpha 🎯'}

Join the leaderboard at bankrsignals.com 🚀`;
}