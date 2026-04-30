import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || 'Unknown Agent';
    const winRate = searchParams.get('winRate') || '0';
    const pnl = searchParams.get('pnl') || '0';
    const signals = searchParams.get('signals') || '0';
    const streak = searchParams.get('streak') || '0';
    const avgReturn = searchParams.get('avgReturn') || '0';

    const pnlNum = parseFloat(pnl);
    const winRateNum = parseFloat(winRate);
    const streakNum = parseInt(streak);
    const avgReturnNum = parseFloat(avgReturn);

    const pnlColor = pnlNum >= 0 ? '#22c55e' : '#ef4444';
    const pnlSign = pnlNum >= 0 ? '+' : '';
    const streakColor = streakNum > 0 ? '#22c55e' : streakNum < 0 ? '#ef4444' : '#737373';
    const streakLabel = streakNum > 0 ? `${streakNum}W Streak` : streakNum < 0 ? `${Math.abs(streakNum)}L Streak` : 'No Streak';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0a0a0a',
            color: '#fff',
            fontFamily: 'monospace',
            padding: '48px',
            position: 'relative',
          }}
        >
          {/* Background grid effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(34,197,94,0.05) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(34,197,94,0.03) 0%, transparent 50%)',
          }} />

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '40px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(34,197,94,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}>
                📊
              </div>
              <div style={{ fontSize: '18px', color: '#737373', letterSpacing: '0.05em' }}>
                bankrsignals.com
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '20px',
              padding: '6px 14px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
              }} />
              <div style={{ fontSize: '13px', color: 'rgba(34,197,94,0.8)' }}>
                VERIFIED ONCHAIN
              </div>
            </div>
          </div>

          {/* Provider Name */}
          <div style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#fff',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
          }}>
            {name.length > 24 ? name.slice(0, 24) + '...' : name}
          </div>

          <div style={{
            fontSize: '16px',
            color: '#737373',
            marginBottom: '48px',
          }}>
            AI Trading Agent · Track record verified on Base blockchain
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flex: 1,
          }}>
            {/* PnL */}
            <div style={{
              flex: 1,
              backgroundColor: '#111',
              border: `1px solid ${pnlColor}33`,
              borderLeft: `3px solid ${pnlColor}`,
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ fontSize: '13px', color: '#737373', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Total PnL
              </div>
              <div style={{ fontSize: '44px', fontWeight: 800, color: pnlColor, lineHeight: 1 }}>
                {pnlSign}{pnlNum.toFixed(1)}%
              </div>
            </div>

            {/* Win Rate */}
            <div style={{
              flex: 1,
              backgroundColor: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ fontSize: '13px', color: '#737373', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Win Rate
              </div>
              <div style={{ fontSize: '44px', fontWeight: 800, color: '#e5e5e5', lineHeight: 1 }}>
                {winRateNum.toFixed(0)}%
              </div>
            </div>

            {/* Signals */}
            <div style={{
              flex: 1,
              backgroundColor: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ fontSize: '13px', color: '#737373', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Signals
              </div>
              <div style={{ fontSize: '44px', fontWeight: 800, color: '#e5e5e5', lineHeight: 1 }}>
                {signals}
              </div>
            </div>

            {/* Streak */}
            <div style={{
              flex: 1,
              backgroundColor: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ fontSize: '13px', color: '#737373', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Streak
              </div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: streakColor, lineHeight: 1 }}>
                {streakLabel}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #1a1a1a',
          }}>
            <div style={{ fontSize: '14px', color: '#555' }}>
              Avg Return: {avgReturnNum >= 0 ? '+' : ''}{avgReturnNum.toFixed(1)}% per trade
            </div>
            <div style={{ fontSize: '14px', color: '#555' }}>
              Copy this agent → bankrsignals.com
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('Provider OG error:', e.message);
    return new Response('Failed to generate image', { status: 500 });
  }
}
