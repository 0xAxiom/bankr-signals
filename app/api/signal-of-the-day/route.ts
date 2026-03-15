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

    // Get the best performing closed signal from the last 7 days
    const { data: signals, error } = await supabase
      .from('signals')
      .select(`
        *,
        providers (name, twitter)
      `)
      .eq('status', 'closed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('pnl_pct', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }

    if (!signals || signals.length === 0) {
      // If no closed signals in last 7 days, get the best open signal
      const { data: openSignals, error: openError } = await supabase
        .from('signals')
        .select(`
          *,
          providers (name, twitter)
        `)
        .eq('status', 'open')
        .order('pnl_pct', { ascending: false })
        .limit(5);

      if (openError || !openSignals || openSignals.length === 0) {
        return NextResponse.json({ 
          error: 'No signals available',
          signal: null,
          tweetText: 'No signals available for Signal of the Day'
        }, { status: 404 });
      }

      const bestSignal = openSignals[0];
      const tweetText = generateTweetText(bestSignal, true);
      
      return NextResponse.json({
        signal: bestSignal,
        tweetText,
        isOpen: true,
        message: 'Using best open signal (no closed signals in last 7 days)'
      });
    }

    // Select the best closed signal
    const bestSignal = signals[0];
    const tweetText = generateTweetText(bestSignal, false);

    return NextResponse.json({
      signal: bestSignal,
      tweetText,
      isOpen: false,
      message: 'Best performing signal from last 7 days'
    });

  } catch (error) {
    console.error('Error fetching signal of the day:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateTweetText(signal: any, isOpen: boolean): string {
  const provider = signal.providers;
  const direction = signal.action.toUpperCase();
  const asset = signal.asset.toUpperCase();
  const leverage = signal.leverage ? `${signal.leverage}x` : '';
  const pnlFormatted = signal.pnl_pct > 0 ? `+${signal.pnl_pct.toFixed(1)}%` : `${signal.pnl_pct.toFixed(1)}%`;
  const twitterHandle = provider?.twitter ? `@${provider.twitter}` : provider?.name || 'Anonymous';
  
  if (isOpen) {
    return `🚀 LIVE SIGNAL OF THE DAY

${direction} $${asset} ${leverage}
Current: ${pnlFormatted}

By ${twitterHandle}

${signal.reasoning || 'Strong conviction play'}

Track live at bankrsignals.com 📊`;
  }

  const daysAgo = Math.floor((Date.now() - new Date(signal.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const timeText = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;

  return `💰 SIGNAL OF THE DAY

${direction} $${asset} ${leverage}
Result: ${pnlFormatted}

Called by ${twitterHandle} ${timeText}

${signal.reasoning || 'Another winner from our top traders'}

See more signals at bankrsignals.com 📈`;
}