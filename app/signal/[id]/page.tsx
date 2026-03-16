import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { SignalCard } from '@/app/feed/signal-card';
import { ShareSignalButton } from '@/app/components/ShareSignalButton';

interface PageProps {
  params: {
    id: string;
  };
}

async function getSignalData(signalId: string) {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NODE_ENV === 'production' 
      ? 'https://bankrsignals.com' 
      : 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/signals/${signalId}`, {
      next: { revalidate: 60 } // Cache for 1 minute
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch signal:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const signal = await getSignalData(params.id);
  
  if (!signal) {
    return {
      title: 'Signal Not Found - Bankr Signals',
      description: 'The signal you\'re looking for could not be found.',
    };
  }

  const pnlText = signal.pnl != null 
    ? `${signal.pnl >= 0 ? '+' : ''}${signal.pnl.toFixed(1)}% PnL` 
    : '';
  
  const title = `${signal.action} $${signal.token} by ${signal.providerName} ${pnlText ? `• ${pnlText}` : ''}`;
  const description = signal.reasoning || `${signal.action} signal for $${signal.token} at $${signal.entryPrice}${signal.leverage ? ` with ${signal.leverage}x leverage` : ''}. Verified onchain trading signal.`;

  const ogImageUrl = `/api/og/signal?` + new URLSearchParams({
    id: signal.id,
    provider: signal.providerName,
    action: signal.action,
    token: signal.token,
    entryPrice: signal.entryPrice.toString(),
    leverage: signal.leverage?.toString() || '1',
    reasoning: signal.reasoning || '',
    ...(signal.pnl && { 
      pnl: ((signal.entryPrice * (signal.pnl / 100))).toFixed(2),
      pnlPercent: signal.pnl.toString()
    }),
    status: signal.status.toUpperCase(),
    ...(signal.txHash && { txHash: signal.txHash })
  }).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${signal.action} $${signal.token} signal by ${signal.providerName}`,
        },
      ],
      type: 'article',
      siteName: 'Bankr Signals',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
      creator: '@AxiomBot',
      site: '@AxiomBot',
    },
  };
}

export default async function SignalPage({ params }: PageProps) {
  const signal = await getSignalData(params.id);

  if (!signal) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">
          {signal.action} ${signal.token} Signal
        </h1>
        <p className="text-[#737373] mb-6">
          by <a 
            href={`/provider/${signal.providerAddress}`} 
            className="text-[rgba(34,197,94,0.8)] hover:text-[rgba(34,197,94,1)] font-medium transition-colors"
          >
            {signal.providerName}
          </a>
        </p>
        
        {/* Share buttons */}
        <div className="flex justify-center">
          <ShareSignalButton
            signal={{
              id: signal.id,
              provider: signal.providerName,
              action: signal.action,
              token: signal.token,
              entryPrice: signal.entryPrice,
              leverage: signal.leverage,
              reasoning: signal.reasoning || '',
              pnlPct: signal.pnl,
              status: signal.status
            }}
            variant="full"
          />
        </div>
      </div>

      {/* Signal Card */}
      <div className="mb-8">
        <SignalCard trade={signal} />
      </div>

      {/* Additional Details */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span> Signal Details
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-[#e5e5e5] mb-3">Position Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#737373]">Action</span>
                <span className={`font-mono font-bold ${
                  signal.action === 'LONG' || signal.action === 'BUY' 
                    ? 'text-[rgba(34,197,94,0.8)]' 
                    : 'text-[rgba(239,68,68,0.8)]'
                }`}>
                  {signal.action}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">Token</span>
                <span className="font-mono font-bold">${signal.token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">Entry Price</span>
                <span className="font-mono">${signal.entryPrice.toLocaleString()}</span>
              </div>
              {signal.leverage && signal.leverage > 1 && (
                <div className="flex justify-between">
                  <span className="text-[#737373]">Leverage</span>
                  <span className="font-mono">{signal.leverage}x</span>
                </div>
              )}
              {signal.collateralUsd && (
                <div className="flex justify-between">
                  <span className="text-[#737373]">Position Size</span>
                  <span className="font-mono">${signal.collateralUsd.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[#e5e5e5] mb-3">Performance</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#737373]">Status</span>
                <span className={`font-mono text-xs px-2 py-1 rounded ${
                  signal.status === "closed" ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]" :
                  signal.status === "stopped" ? "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]" :
                  "bg-[rgba(234,179,8,0.1)] text-[rgba(234,179,8,0.8)]"
                }`}>
                  {signal.status.toUpperCase()}
                </span>
              </div>
              {signal.pnl != null && (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#737373]">PnL %</span>
                    <span className={`font-mono font-bold ${
                      signal.pnl >= 0 ? 'text-[rgba(34,197,94,0.8)]' : 'text-[rgba(239,68,68,0.8)]'
                    }`}>
                      {signal.pnl >= 0 ? '+' : ''}{signal.pnl.toFixed(2)}%
                    </span>
                  </div>
                  {signal.collateralUsd && (
                    <div className="flex justify-between">
                      <span className="text-[#737373]">PnL USD</span>
                      <span className={`font-mono font-bold ${
                        signal.pnl >= 0 ? 'text-[rgba(34,197,94,0.8)]' : 'text-[rgba(239,68,68,0.8)]'
                      }`}>
                        ${signal.pnl >= 0 ? '+' : ''}{(signal.collateralUsd * (signal.pnl / 100)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {signal.confidence && (
                <div className="flex justify-between">
                  <span className="text-[#737373]">Confidence</span>
                  <span className="font-mono">{Math.round(signal.confidence * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification */}
        {signal.txHash && (
          <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
            <h3 className="text-sm font-medium text-[#e5e5e5] mb-3 flex items-center gap-2">
              <span className="text-[rgba(34,197,94,0.6)]">✓</span>
              Blockchain Verification
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#737373]">Entry TX:</span>
                <a
                  href={`https://basescan.org/tx/${signal.txHash}`}
                  target="_blank"
                  rel="noopener"
                  className="text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.8)] font-mono transition-colors"
                >
                  {signal.txHash.slice(0, 20)}...{signal.txHash.slice(-10)}
                </a>
              </div>
              {signal.exitTxHash && (
                <div className="flex items-center gap-2">
                  <span className="text-[#737373]">Exit TX:</span>
                  <a
                    href={`https://basescan.org/tx/${signal.exitTxHash}`}
                    target="_blank"
                    rel="noopener"
                    className="text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.8)] font-mono transition-colors"
                  >
                    {signal.exitTxHash.slice(0, 20)}...{signal.exitTxHash.slice(-10)}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Back to Feed */}
      <div className="text-center mt-8">
        <a
          href="/feed"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e5e5e5] rounded-lg transition-colors"
        >
          ← Back to Live Feed
        </a>
      </div>
    </main>
  );
}