import { NextResponse } from 'next/server';
import { dbGetSignals, dbGetProviders } from '@/lib/db';

export async function GET() {
  try {

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
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Get all signals using helper function with fallback
  const allSignals = await dbGetSignals(1000);
  const allProviders = await dbGetProviders();
  
  // Filter signals by date window
  const recentSignals = allSignals.filter(s => 
    new Date(s.timestamp || s.created_at) >= cutoffDate
  );
  
  // First priority: Closed signals with positive PnL
  const closedSignals = recentSignals
    .filter(s => s.status === 'closed' && (s.pnl_pct || 0) > 5) // At least 5% profit to be featured
    .sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0));

  if (closedSignals.length > 0) {
    const signal = closedSignals[0];
    const provider = allProviders.find(p => p.address === signal.provider);
    return { ...signal, providers: provider };
  }

  // Second priority: Recent high-confidence open signals with good unrealized PnL
  const openSignals = recentSignals
    .filter(s => 
      s.status === 'open' && 
      (s.confidence || 0) >= 0.8 && 
      (s.pnl_pct || 0) > 0
    )
    .sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0));

  if (openSignals.length > 0) {
    const signal = openSignals[0];
    const provider = allProviders.find(p => p.address === signal.provider);
    return { ...signal, providers: provider };
  }

  return null;
}

async function getAllTimeBest() {
  // Get all signals using helper function with fallback
  const allSignals = await dbGetSignals(1000);
  const allProviders = await dbGetProviders();
  
  // Filter for closed signals with good PnL
  const bestSignals = allSignals
    .filter(s => s.status === 'closed' && (s.pnl_pct || 0) > 10) // Only show truly impressive results
    .sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0));

  if (bestSignals.length === 0) {
    return null;
  }

  const signal = bestSignals[0];
  const provider = allProviders.find(p => p.address === signal.provider);
  return { ...signal, providers: provider };
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