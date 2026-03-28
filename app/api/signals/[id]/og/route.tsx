import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

async function getSignal(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bankrsignals.com';
    const response = await fetch(`${baseUrl}/api/signals/${id}`, {
      next: { revalidate: 60 }
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching signal for OG:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const signal = await getSignal(id);
  
  if (!signal) {
    return new Response('Signal not found', { status: 404 });
  }

  // Determine colors based on action and PnL
  const isLong = signal.action === 'LONG';
  const hasProfit = signal.pnl && signal.pnl > 0;
  const hasLoss = signal.pnl && signal.pnl < 0;
  
  const primaryColor = isLong ? '#22c55e' : '#ef4444';
  const bgGradient = isLong 
    ? 'linear-gradient(135deg, #0a0a0a 0%, #1a2e05 50%, #0a0a0a 100%)'
    : 'linear-gradient(135deg, #0a0a0a 0%, #2e0505 50%, #0a0a0a 100%)';
  
  const pnlColor = hasProfit ? '#22c55e' : hasLoss ? '#ef4444' : '#737373';
  const pnlText = signal.pnl 
    ? `${signal.pnl > 0 ? '+' : ''}${signal.pnl.toFixed(1)}%`
    : 'Open';

  // Truncate reasoning if too long
  const maxReasoningLength = 120;
  const reasoning = signal.reasoning?.length > maxReasoningLength
    ? `${signal.reasoning.substring(0, maxReasoningLength)}...`
    : signal.reasoning || '';

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
    return `$${price.toLocaleString()}`;
  };

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          background: bgGradient,
          fontFamily: 'Inter, system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '40px 50px 20px',
            borderBottom: '1px solid #2a2a2a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '30px',
                background: `${primaryColor}20`,
                border: `2px solid ${primaryColor}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ color: '#e5e5e5', fontSize: '24px', fontWeight: '600' }}>
                {signal.providerName}
              </div>
              <div style={{ color: '#737373', fontSize: '16px' }}>
                Trading Agent
              </div>
            </div>
          </div>
          
          <div
            style={{
              background: signal.status === 'closed' ? '#22c55e20' : '#f59e0b20',
              border: signal.status === 'closed' ? '1px solid #22c55e40' : '1px solid #f59e0b40',
              color: signal.status === 'closed' ? '#22c55e' : '#f59e0b',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
            }}
          >
            {signal.status === 'closed' ? '✅ Closed' : '🔄 Open'}
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            padding: '40px 50px',
          }}
        >
          {/* Left Side - Trade Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 2,
              gap: '24px',
            }}
          >
            {/* Action + Token */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  color: primaryColor,
                  fontSize: '48px',
                  fontWeight: '900',
                  letterSpacing: '2px',
                }}
              >
                {signal.action}
              </div>
              <div style={{ color: '#e5e5e5', fontSize: '56px', fontWeight: '800' }}>
                {signal.token}
              </div>
              {signal.leverage > 1 && (
                <div
                  style={{
                    background: primaryColor,
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '700',
                  }}
                >
                  {signal.leverage}x
                </div>
              )}
            </div>

            {/* Trade Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#737373', fontSize: '18px' }}>Entry Price</span>
                <span style={{ color: '#e5e5e5', fontSize: '18px', fontWeight: '600' }}>
                  {formatPrice(signal.entryPrice)}
                </span>
              </div>
              {signal.exitPrice && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#737373', fontSize: '18px' }}>Exit Price</span>
                  <span style={{ color: '#e5e5e5', fontSize: '18px', fontWeight: '600' }}>
                    {formatPrice(signal.exitPrice)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#737373', fontSize: '18px' }}>Confidence</span>
                <span style={{ color: '#e5e5e5', fontSize: '18px', fontWeight: '600' }}>
                  {((signal.confidence || 0.5) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Reasoning */}
            {reasoning && (
              <div>
                <div style={{ color: '#737373', fontSize: '16px', marginBottom: '8px' }}>
                  Trade Thesis
                </div>
                <div
                  style={{
                    color: '#e5e5e5',
                    fontSize: '18px',
                    lineHeight: 1.4,
                    background: '#111',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #2a2a2a',
                  }}
                >
                  "{reasoning}"
                </div>
              </div>
            )}
          </div>

          {/* Right Side - PnL */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: hasProfit ? '#22c55e10' : hasLoss ? '#ef444410' : '#37373710',
                border: hasProfit ? '2px solid #22c55e30' : hasLoss ? '2px solid #ef444430' : '2px solid #37373730',
                borderRadius: '16px',
                padding: '40px',
                minWidth: '200px',
              }}
            >
              <div
                style={{
                  color: pnlColor,
                  fontSize: '48px',
                  fontWeight: '900',
                  marginBottom: '8px',
                }}
              >
                {pnlText}
              </div>
              <div style={{ color: '#737373', fontSize: '18px' }}>
                {signal.pnl ? 'Total Return' : 'Status'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 50px 40px',
            borderTop: '1px solid #2a2a2a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>📊</div>
            <div style={{ color: '#e5e5e5', fontSize: '24px', fontWeight: '600' }}>
              Bankr Signals
            </div>
          </div>
          <div style={{ color: '#737373', fontSize: '16px' }}>
            bankrsignals.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}