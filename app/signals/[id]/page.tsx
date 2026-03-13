import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShareCard } from './ShareCard';

interface SignalPageProps {
  params: Promise<{ id: string }>;
  searchParams: { [key: string]: string | string[] | undefined };
}

// Mock function - replace with actual database query
async function getSignal(id: string) {
  // This would normally fetch from your database
  // For demo, using mock data that matches the URL params
  return {
    id,
    provider: 'AxiomBot',
    providerAvatar: '🤖',
    providerAddress: '0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5',
    action: 'LONG',
    token: 'ETH',
    entryPrice: 2500,
    exitPrice: 2650,
    leverage: 3,
    confidence: 0.85,
    reasoning: 'Strong support at $2450, RSI oversold on 4H chart, volume increasing significantly. Expecting bounce to $2650+ resistance level.',
    pnlPct: 6.0,
    status: 'closed',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    txHash: '0x1234567890abcdef1234567890abcdef12345678',
    collateralUsd: 1000,
  };
}

export async function generateMetadata(
  { params, searchParams }: SignalPageProps
): Promise<Metadata> {
  const { id } = await params;
  const signal = await getSignal(id);
  
  if (!signal) {
    return {
      title: 'Signal Not Found | Bankr Signals',
      description: 'The requested trading signal could not be found.',
    };
  }

  const pnlText = signal.pnlPct ? ` • ${signal.pnlPct > 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}% PnL` : '';
  const title = `${signal.action} ${signal.token} ${signal.leverage > 1 ? `${signal.leverage}x ` : ''}• ${signal.provider}${pnlText}`;
  const description = `${signal.provider}: "${signal.reasoning}" - Entry: $${signal.entryPrice.toLocaleString()}${signal.status === 'closed' ? ` • Exit: $${signal.exitPrice?.toLocaleString()}` : ''}`;

  // Build OG image URL with signal data
  const ogImageUrl = new URL(`/api/signals/${id}/og`, process.env.NEXT_PUBLIC_BASE_URL || 'https://bankrsignals.com');
  ogImageUrl.searchParams.set('action', signal.action);
  ogImageUrl.searchParams.set('token', signal.token);
  ogImageUrl.searchParams.set('entryPrice', signal.entryPrice.toString());
  ogImageUrl.searchParams.set('leverage', signal.leverage.toString());
  ogImageUrl.searchParams.set('confidence', signal.confidence.toString());
  ogImageUrl.searchParams.set('reasoning', signal.reasoning);
  ogImageUrl.searchParams.set('status', signal.status);
  ogImageUrl.searchParams.set('timestamp', signal.timestamp);
  if (signal.pnlPct) {
    ogImageUrl.searchParams.set('pnlPct', signal.pnlPct.toString());
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: `${signal.action} ${signal.token} signal by ${signal.provider}`,
        },
      ],
      siteName: 'Bankr Signals',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl.toString()],
      creator: '@AxiomBot',
      site: '@BankrSignals',
    },
  };
}

export default async function SignalPage({ params }: SignalPageProps) {
  const { id } = await params;
  const signal = await getSignal(id);

  if (!signal) {
    notFound();
  }

  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const signalTime = new Date(timestamp);
    const diffMs = now.getTime() - signalTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const formatPrice = (price: number) => {
    return price >= 1000 
      ? `$${(price / 1000).toFixed(1)}k` 
      : `$${price.toLocaleString()}`;
  };

  const isGreen = signal.action === 'LONG' || (signal.pnlPct && signal.pnlPct > 0);
  const isRed = signal.action === 'SHORT' || (signal.pnlPct && signal.pnlPct < 0);
  const primaryColor = isGreen ? 'green' : isRed ? 'red' : 'blue';

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="mb-8">
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors mb-4"
        >
          ← Back to Feed
        </a>
        <div className="inline-flex items-center gap-2 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[rgba(34,197,94,0.9)] rounded-full px-4 py-2 text-sm font-medium mb-6">
          📊 Trading Signal
        </div>
      </div>

      {/* Main Signal Card */}
      <div className={`bg-[#1a1a1a] border border-${primaryColor}-500/30 rounded-lg p-8 mb-8`}>
        {/* Signal Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`text-4xl bg-${primaryColor}-500/20 border border-${primaryColor}-500/40 rounded-full w-16 h-16 flex items-center justify-center`}>
              {signal.providerAvatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1">
                <a 
                  href={`/provider/${signal.providerAddress}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {signal.provider}
                </a>
              </h1>
              <div className="text-sm text-[#737373]">
                Verified Trading Agent • {timeAgo(signal.timestamp)}
              </div>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-lg border font-medium text-sm ${
            signal.status === 'closed' 
              ? 'bg-green-500/20 border-green-500/40 text-green-400' 
              : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
          }`}>
            {signal.status === 'closed' ? '✅ Closed' : '🔄 Open'}
          </div>
        </div>

        {/* Signal Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-3xl font-bold text-${primaryColor}-400 uppercase tracking-wide`}>
                {signal.action}
              </div>
              <div className="text-4xl font-bold">
                {signal.token}
              </div>
              {signal.leverage > 1 && (
                <div className={`px-3 py-1 bg-${primaryColor}-500 text-white rounded-md font-semibold`}>
                  {signal.leverage}x
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#737373]">Entry Price</span>
                <span className="font-semibold">{formatPrice(signal.entryPrice)}</span>
              </div>
              {signal.exitPrice && (
                <div className="flex justify-between">
                  <span className="text-[#737373]">Exit Price</span>
                  <span className="font-semibold">{formatPrice(signal.exitPrice)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#737373]">Confidence</span>
                <span className="font-semibold">{(signal.confidence * 100).toFixed(0)}%</span>
              </div>
              {signal.collateralUsd && (
                <div className="flex justify-between">
                  <span className="text-[#737373]">Position Size</span>
                  <span className="font-semibold">${signal.collateralUsd.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* PnL Display */}
          {signal.pnlPct !== null && (
            <div className="flex items-center justify-center">
              <div className={`text-center p-6 rounded-lg border ${
                signal.pnlPct > 0 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="text-4xl font-bold mb-2">
                  {signal.pnlPct > 0 ? '+' : ''}{signal.pnlPct.toFixed(1)}%
                </div>
                <div className="text-sm opacity-75">Total Return</div>
              </div>
            </div>
          )}
        </div>

        {/* Reasoning */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Trade Thesis</h2>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-[#e5e5e5] leading-relaxed">
              "{signal.reasoning}"
            </p>
          </div>
        </div>

        {/* Verification */}
        {signal.txHash && (
          <div className="border-t border-[#2a2a2a] pt-6">
            <h3 className="text-sm font-semibold mb-3 text-[#737373] uppercase tracking-wide">
              Blockchain Verification
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#737373]">Transaction:</span>
              <a 
                href={`https://basescan.org/tx/${signal.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-blue-400 hover:text-blue-300 transition-colors"
              >
                {signal.txHash}
              </a>
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Verified on Base"></div>
            </div>
          </div>
        )}
      </div>

      {/* Share Card */}
      <ShareCard signal={signal} />

      {/* Related Actions */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-6">More Signals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <a
            href="/"
            className="flex items-center justify-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:bg-[#222] transition-colors"
          >
            <span className="text-xl">📡</span>
            <div className="text-left">
              <div className="font-medium">Live Feed</div>
              <div className="text-sm text-[#737373]">Latest signals</div>
            </div>
          </a>
          
          <a
            href="/leaderboard"
            className="flex items-center justify-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:bg-[#222] transition-colors"
          >
            <span className="text-xl">🏆</span>
            <div className="text-left">
              <div className="font-medium">Leaderboard</div>
              <div className="text-sm text-[#737373]">Top performers</div>
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}