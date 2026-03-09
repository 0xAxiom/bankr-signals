import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Mock function - replace with actual database query
async function getSignal(id: string) {
  // This would normally fetch from your database
  // For now, using URL searchParams data
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get signal data from URL params (as set in the signal page metadata)
    const action = searchParams.get('action') || 'LONG';
    const token = searchParams.get('token') || 'ETH';
    const entryPrice = searchParams.get('entryPrice') || '0';
    const leverage = parseInt(searchParams.get('leverage') || '1');
    const confidence = parseFloat(searchParams.get('confidence') || '0.5');
    const reasoning = searchParams.get('reasoning') || '';
    const status = searchParams.get('status') || 'open';
    const timestamp = searchParams.get('timestamp') || new Date().toISOString();
    const pnlPct = searchParams.get('pnlPct');
    
    // Calculate time ago
    const timeAgo = (timestamp: string) => {
      const now = new Date();
      const signalTime = new Date(timestamp);
      const diffMs = now.getTime() - signalTime.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 1) return 'just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    };

    const formatPrice = (price: string) => {
      const num = parseFloat(price);
      return num >= 1000 
        ? `$${(num / 1000).toFixed(1)}k` 
        : `$${num.toLocaleString()}`;
    };

    // Determine colors based on action and PnL
    const isLong = action === 'LONG';
    const hasProfit = pnlPct && parseFloat(pnlPct) > 0;
    const hasLoss = pnlPct && parseFloat(pnlPct) < 0;
    
    let primaryColor = '#22c55e'; // green
    let backgroundColor = '#0a0a0a';
    let borderColor = '#22c55e';
    
    if (action === 'SHORT' || hasLoss) {
      primaryColor = '#ef4444'; // red
      borderColor = '#ef4444';
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: backgroundColor,
            color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at 20% 20%, ${primaryColor}15 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${primaryColor}10 0%, transparent 50%)`,
            }}
          />
          
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '40px',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: `${primaryColor}30`,
                  border: `3px solid ${primaryColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Bankr Signals
                </div>
                <div style={{ fontSize: '20px', color: '#888', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📊</span>
                  Verified Trading Signal • {timeAgo(timestamp)}
                </div>
              </div>
            </div>
            
            <div
              style={{
                padding: '15px 25px',
                backgroundColor: status === 'closed' ? '#22c55e30' : '#f59e0b30',
                border: `2px solid ${status === 'closed' ? '#22c55e' : '#f59e0b'}`,
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: status === 'closed' ? '#22c55e' : '#f59e0b',
              }}
            >
              {status === 'closed' ? '✅ CLOSED' : '🔄 OPEN'}
            </div>
          </div>

          {/* Main Signal Display */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '50px',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: primaryColor,
                  letterSpacing: '2px',
                }}
              >
                {action}
              </div>
              <div
                style={{
                  fontSize: '84px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                }}
              >
                {token}
              </div>
              {leverage > 1 && (
                <div
                  style={{
                    padding: '12px 20px',
                    backgroundColor: primaryColor,
                    color: '#000000',
                    borderRadius: '10px',
                    fontSize: '32px',
                    fontWeight: 'bold',
                  }}
                >
                  {leverage}x
                </div>
              )}
            </div>

            {pnlPct && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px',
                  backgroundColor: hasProfit ? '#22c55e20' : '#ef444420',
                  border: `3px solid ${hasProfit ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '20px',
                }}
              >
                <div
                  style={{
                    fontSize: '64px',
                    fontWeight: 'bold',
                    color: hasProfit ? '#22c55e' : '#ef4444',
                    marginBottom: '10px',
                  }}
                >
                  {parseFloat(pnlPct) > 0 ? '+' : ''}{parseFloat(pnlPct).toFixed(1)}%
                </div>
                <div style={{ fontSize: '18px', color: '#888' }}>
                  PnL
                </div>
              </div>
            )}
          </div>

          {/* Signal Details */}
          <div
            style={{
              display: 'flex',
              gap: '60px',
              marginBottom: '40px',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '18px', color: '#888' }}>Entry Price</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {formatPrice(entryPrice)}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '18px', color: '#888' }}>Confidence</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {Math.round(confidence * 100)}%
              </div>
            </div>
          </div>

          {/* Trade Thesis */}
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '2px solid #333',
              borderRadius: '15px',
              padding: '30px',
              marginBottom: '30px',
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: '20px', color: '#888', marginBottom: '15px' }}>
              Trade Thesis
            </div>
            <div style={{ fontSize: '24px', lineHeight: '1.4', color: '#ffffff' }}>
              "{reasoning.slice(0, 180)}{reasoning.length > 180 ? '...' : ''}"
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'auto',
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: '18px', color: '#888' }}>
              🔗 Verified with Base blockchain transaction
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: primaryColor }}>
              bankrsignals.com
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Fallback image
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
            color: '#ffffff',
            fontFamily: 'system-ui',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '30px' }}>📊</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>
            Bankr Signals
          </div>
          <div style={{ fontSize: '24px', color: '#888' }}>
            Verified Trading Signal
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}