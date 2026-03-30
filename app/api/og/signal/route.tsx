import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signalId = searchParams.get('id');
    const provider = searchParams.get('provider') || 'Unknown';
    const asset = searchParams.get('asset') || 'BTC';
    const direction = searchParams.get('direction') || 'LONG';
    const pnl = searchParams.get('pnl') || '0';
    const reasoning = searchParams.get('reasoning') || 'Signal reasoning unavailable';
    const leverage = searchParams.get('leverage') || '1';
    
    const isProfit = parseFloat(pnl) >= 0;
    const pnlColor = isProfit ? '#10b981' : '#ef4444';
    const directionColor = direction === 'LONG' ? '#10b981' : '#ef4444';

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
            color: '#fff',
            fontFamily: 'Inter',
          }}
        >
          {/* Header */}
          <div style={{ 
            position: 'absolute', 
            top: 40, 
            left: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}>
              📊
            </div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>
              bankrsignals.com
            </div>
          </div>

          {/* Main Content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            marginTop: 20,
          }}>
            {/* Provider */}
            <div style={{
              fontSize: 28,
              color: '#9ca3af',
              marginBottom: -10,
            }}>
              Signal by {provider}
            </div>

            {/* Asset and Direction */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{
                fontSize: 72,
                fontWeight: 900,
                color: directionColor,
              }}>
                {direction}
              </div>
              <div style={{
                fontSize: 64,
                fontWeight: 700,
                color: '#fff',
              }}>
                {asset}
              </div>
              {leverage !== '1' && (
                <div style={{
                  fontSize: 32,
                  color: '#6b7280',
                  backgroundColor: '#1f2937',
                  padding: '8px 16px',
                  borderRadius: 8,
                }}>
                  {leverage}x
                </div>
              )}
            </div>

            {/* PnL */}
            {pnl !== '0' && (
              <div style={{
                fontSize: 36,
                fontWeight: 600,
                color: pnlColor,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                {isProfit ? '↗' : '↘'} {pnl}%
              </div>
            )}

            {/* Reasoning */}
            <div style={{
              fontSize: 20,
              color: '#d1d5db',
              textAlign: 'center',
              maxWidth: '80%',
              lineHeight: 1.4,
              marginTop: 16,
            }}>
              "{reasoning.length > 120 ? reasoning.substring(0, 120) + '...' : reasoning}"
            </div>
          </div>

          {/* Footer */}
          <div style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            fontSize: 18,
            color: '#6b7280',
          }}>
            #{signalId}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('Error generating OG image:', e.message);
    return new Response('Failed to generate image', { status: 500 });
  }
}