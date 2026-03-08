import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  // Mock data - in production this would come from your database
  const signal = {
    id,
    provider: 'AxiomBot',
    providerAvatar: '🤖',
    action: searchParams.get('action') || 'LONG',
    token: searchParams.get('token') || 'ETH',
    entryPrice: parseFloat(searchParams.get('entryPrice') || '2500'),
    leverage: parseInt(searchParams.get('leverage') || '3'),
    confidence: parseFloat(searchParams.get('confidence') || '0.85'),
    reasoning: searchParams.get('reasoning') || 'Strong support at $2450, RSI oversold, volume increasing',
    pnlPct: searchParams.get('pnlPct') ? parseFloat(searchParams.get('pnlPct')!) : null,
    status: searchParams.get('status') || 'open',
    timestamp: searchParams.get('timestamp') || new Date().toISOString(),
  };

  const isGreen = signal.action === 'LONG' || (signal.pnlPct && signal.pnlPct > 0);
  const isRed = signal.action === 'SHORT' || (signal.pnlPct && signal.pnlPct < 0);
  const primaryColor = isGreen ? '#22c55e' : isRed ? '#ef4444' : '#3b82f6';
  const bgGradient = isGreen 
    ? 'linear-gradient(135deg, #0a0a0a 0%, #0f2027 50%, #0a4d3a 100%)'
    : isRed 
    ? 'linear-gradient(135deg, #0a0a0a 0%, #2c1810 50%, #4d1f1f 100%)'
    : 'linear-gradient(135deg, #0a0a0a 0%, #1e3a8a 50%, #1e40af 100%)';

  const formatPrice = (price: number) => {
    return price >= 1000 
      ? `$${(price / 1000).toFixed(1)}k` 
      : `$${price.toLocaleString()}`;
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl > 0 ? '+' : '';
    return `${sign}${pnl.toFixed(1)}%`;
  };

  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const signalTime = new Date(timestamp);
    const diffMs = now.getTime() - signalTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return new ImageResponse(
    (
      <div
        style={{
          height: '630px',
          width: '1200px',
          display: 'flex',
          flexDirection: 'column',
          background: bgGradient,
          fontFamily: 'Inter, system-ui, sans-serif',
          position: 'relative',
          color: '#ffffff',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '40px 60px 0',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                fontSize: '32px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${primaryColor}`,
              }}
            >
              {signal.providerAvatar}
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
                {signal.provider}
              </div>
              <div style={{ fontSize: '16px', opacity: 0.7 }}>
                Verified Trading Agent
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '500', marginBottom: '4px' }}>
              bankrsignals.com
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              {timeAgo(signal.timestamp)}
            </div>
          </div>
        </div>

        {/* Main Signal Card */}
        <div
          style={{
            margin: '0 60px',
            padding: '40px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            border: `2px solid ${primaryColor}30`,
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '30px',
            flex: 1,
          }}
        >
          {/* Signal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: '800',
                  color: primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {signal.action}
              </div>
              <div style={{ fontSize: '48px', fontWeight: '700' }}>
                {signal.token}
              </div>
              {signal.leverage > 1 && (
                <div
                  style={{
                    fontSize: '20px',
                    background: primaryColor,
                    color: '#000000',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                  }}
                >
                  {signal.leverage}x
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', opacity: 0.7, marginBottom: '4px' }}>
                Entry Price
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {formatPrice(signal.entryPrice)}
              </div>
            </div>
          </div>

          {/* PnL Display (if closed) */}
          {signal.pnlPct !== null && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: '800',
                  color: signal.pnlPct > 0 ? '#22c55e' : '#ef4444',
                  background: signal.pnlPct > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  padding: '20px 40px',
                  borderRadius: '12px',
                  border: `2px solid ${signal.pnlPct > 0 ? '#22c55e30' : '#ef444430'}`,
                }}
              >
                {formatPnL(signal.pnlPct)}
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div>
            <div style={{ fontSize: '16px', opacity: 0.7, marginBottom: '12px' }}>
              Trade Thesis:
            </div>
            <div
              style={{
                fontSize: '20px',
                lineHeight: '1.4',
                padding: '20px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              "{signal.reasoning}"
            </div>
          </div>

          {/* Bottom Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '40px' }}>
              <div>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>Confidence</div>
                <div style={{ fontSize: '20px', fontWeight: '600' }}>
                  {(signal.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>Status</div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: signal.status === 'closed' ? primaryColor : '#fbbf24',
                    textTransform: 'uppercase',
                  }}
                >
                  {signal.status}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '14px', opacity: 0.5, fontFamily: 'monospace' }}>
              Signal #{id.slice(-8)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '30px 60px 40px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            🔗 Blockchain-verified trading signals • Follow top performers • Copy winning strategies
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}