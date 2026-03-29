import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from '@vercel/og';
import { dbGetSignal, dbGetProviders } from '@/lib/db';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const signalId = params.id;
    
    // Get signal data
    const signal = await dbGetSignal(signalId);
    if (!signal) {
      return new NextResponse('Signal not found', { status: 404 });
    }

    // Get provider data
    const providers = await dbGetProviders();
    const provider = providers.find(p => 
      p.address.toLowerCase() === signal.provider.toLowerCase()
    );

    if (!provider) {
      return new NextResponse('Provider not found', { status: 404 });
    }

    // Format data for display
    const action = signal.action.toUpperCase();
    const actionColor = ['LONG', 'BUY'].includes(action) ? '#22c55e' : '#ef4444';
    const leverage = signal.leverage > 1 ? `${signal.leverage}x` : '';
    
    // Format PnL
    const pnlText = signal.pnl_pct !== null 
      ? `${signal.pnl_pct >= 0 ? '+' : ''}${signal.pnl_pct.toFixed(1)}%`
      : signal.status === 'open' ? 'OPEN' : 'N/A';
    
    const pnlColor = signal.pnl_pct !== null 
      ? signal.pnl_pct >= 0 ? '#22c55e' : '#ef4444'
      : '#f97316';

    // Format entry price
    const entryPrice = signal.entry_price < 0.01 
      ? signal.entry_price.toExponential(2)
      : `$${signal.entry_price.toLocaleString()}`;

    // Format date
    const signalDate = new Date(signal.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Generate the image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: '#e5e5e5',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            padding: '40px',
          }}
        >
          {/* Background gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
              border: '2px solid #2a2a2a',
              borderRadius: '24px',
              padding: '48px',
              backgroundColor: 'rgba(26, 26, 26, 0.8)',
              backdropFilter: 'blur(10px)',
              width: '100%',
              maxWidth: '600px',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                📊 VERIFIED SIGNAL
              </div>
            </div>

            {/* Provider info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#e5e5e5',
                  marginRight: '12px',
                }}
              >
                {provider.name}
              </div>
              <div
                style={{
                  fontSize: '20px',
                  color: '#666',
                }}
              >
                • {signalDate}
              </div>
            </div>

            {/* Main signal info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                gap: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: '900',
                  color: actionColor,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {leverage} {action}
              </div>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: '900',
                  color: '#e5e5e5',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {signal.token}
              </div>
            </div>

            {/* Performance & Entry */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    color: '#999',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Entry Price
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#e5e5e5',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {entryPrice}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    color: '#999',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Performance
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: '900',
                    color: pnlColor,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {pnlText}
                </div>
              </div>
            </div>

            {/* Reasoning (if available) */}
            {signal.reasoning && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: '32px',
                  maxWidth: '500px',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    color: '#999',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Reasoning
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    color: '#b0b0b0',
                    textAlign: 'center',
                    lineHeight: 1.4,
                    fontStyle: 'italic',
                  }}
                >
                  "{signal.reasoning.slice(0, 120)}{signal.reasoning.length > 120 ? '...' : ''}"
                </div>
              </div>
            )}

            {/* Status badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  backgroundColor: signal.status === 'open' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(42, 42, 42, 1)',
                  color: signal.status === 'open' ? '#f97316' : '#999',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {signal.status === 'open' ? 'OPEN' : 'CLOSED'}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '18px',
                color: '#666',
              }}
            >
              <div>🔗</div>
              <div>bankrsignals.com</div>
            </div>
          </div>

          {/* Verification badge */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            ✓ VERIFIED
          </div>
        </div>
      ),
      {
        width: 800,
        height: 600,
      }
    );
  } catch (error) {
    console.error('Signal card generation error:', error);
    return new NextResponse('Failed to generate card', { status: 500 });
  }
}