import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse signal data
    const signalId = searchParams.get('id');
    const providerName = searchParams.get('provider') || 'Agent';
    const action = searchParams.get('action') || 'LONG';
    const token = searchParams.get('token') || 'ETH';
    const leverage = searchParams.get('leverage') || '1';
    const entryPrice = searchParams.get('entryPrice') || '0';
    const currentPrice = searchParams.get('currentPrice');
    const pnl = searchParams.get('pnl');
    const pnlPercent = searchParams.get('pnlPercent');
    const confidence = searchParams.get('confidence');
    const reasoning = searchParams.get('reasoning') || '';
    const status = searchParams.get('status') || 'OPEN';
    const txHash = searchParams.get('txHash');

    // Calculate display values
    const isProfit = pnl && parseFloat(pnl) > 0;
    const isPnlAvailable = pnl && pnlPercent;
    const isVerified = !!txHash;
    const displayPnl = isPnlAvailable ? `${parseFloat(pnl!) >= 0 ? '+' : ''}${parseFloat(pnl!).toFixed(2)}` : '—';
    const displayPnlPercent = isPnlAvailable ? `${parseFloat(pnlPercent!) >= 0 ? '+' : ''}${parseFloat(pnlPercent!).toFixed(1)}%` : '';
    
    // Status colors
    const getStatusColor = () => {
      if (status === 'CLOSED' && isProfit) return '#22c55e'; // green
      if (status === 'CLOSED' && !isProfit) return '#ef4444'; // red
      return '#3b82f6'; // blue for open
    };

    const statusColor = getStatusColor();

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Inter',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '40px 50px',
            borderBottom: '1px solid #2a2a2a',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '25px',
                backgroundColor: statusColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
              }}>
                {action === 'LONG' ? '📈' : '📉'}
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                  {providerName}
                </div>
                <div style={{ fontSize: '18px', color: '#737373' }}>
                  Bankr Signals
                </div>
              </div>
            </div>
            
            {isVerified && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '16px',
                color: '#22c55e',
              }}>
                ✅ Verified
              </div>
            )}
          </div>

          {/* Signal Details */}
          <div style={{
            flex: 1,
            padding: '50px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            {/* Main Position */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '30px',
            }}>
              <div style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: statusColor,
              }}>
                {action}
              </div>
              <div>
                <div style={{
                  fontSize: '64px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                }}>
                  ${token}
                </div>
                <div style={{
                  fontSize: '28px',
                  color: '#737373',
                }}>
                  {leverage}x leverage • ${entryPrice}
                </div>
              </div>
            </div>

            {/* PnL Display */}
            {isPnlAvailable && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: isProfit ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${isProfit ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '12px',
              }}>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: isProfit ? '#22c55e' : '#ef4444',
                }}>
                  ${displayPnl}
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: isProfit ? '#22c55e' : '#ef4444',
                }}>
                  ({displayPnlPercent})
                </div>
              </div>
            )}

            {/* Reasoning */}
            {reasoning && (
              <div style={{
                backgroundColor: '#111111',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                padding: '25px',
                marginBottom: '30px',
              }}>
                <div style={{
                  fontSize: '24px',
                  lineHeight: '1.4',
                  color: '#e5e5e5',
                  fontStyle: 'italic',
                }}>
                  "{reasoning.length > 120 ? reasoning.slice(0, 120) + '...' : reasoning}"
                </div>
              </div>
            )}

            {/* Bottom Stats */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                display: 'flex',
                gap: '40px',
                fontSize: '20px',
                color: '#737373',
              }}>
                <div>
                  <span style={{ color: '#e5e5e5' }}>Status:</span> {status}
                </div>
                {confidence && (
                  <div>
                    <span style={{ color: '#e5e5e5' }}>Confidence:</span> {Math.round(parseFloat(confidence) * 100)}%
                  </div>
                )}
              </div>
              
              <div style={{
                fontSize: '18px',
                color: '#737373',
              }}>
                bankrsignals.com
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '200px',
            height: '200px',
            background: `radial-gradient(circle, ${statusColor}20 0%, transparent 70%)`,
          }} />
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, #1a1a1a 0%, transparent 70%)',
          }} />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}