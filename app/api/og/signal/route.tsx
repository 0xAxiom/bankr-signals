import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function getSignal(id: string) {
  if (!supabase) return null;
  
  const { data: signal, error } = await supabase
    .from('signals')
    .select(`
      *,
      provider_name:providers(name)
    `)
    .eq('id', id)
    .single();

  if (error || !signal) return null;
  
  return {
    ...signal,
    provider_name: signal.provider_name?.name || 'Unknown'
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Missing signal ID', { status: 400 });
    }

    const signal = await getSignal(id);
    if (!signal) {
      return new Response('Signal not found', { status: 404 });
    }

    const isLong = signal.action === 'LONG';
    const isProfitable = signal.pnlPct !== null && signal.pnlPct > 0;
    const isLoss = signal.pnlPct !== null && signal.pnlPct < 0;
    
    const actionColor = isLong ? '#22c55e' : '#ef4444';
    const pnlColor = isProfitable ? '#22c55e' : isLoss ? '#ef4444' : '#737373';
    
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            backgroundColor: '#0a0a0a',
            padding: '60px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: isLong ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: isLong ? '3px solid rgba(34, 197, 94, 0.4)' : '3px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                marginRight: '24px',
              }}
            >
              {isLong ? '📈' : '📉'}
            </div>
            <div>
              <div
                style={{
                  color: actionColor,
                  fontSize: '48px',
                  fontWeight: 'bold',
                  lineHeight: '1',
                }}
              >
                {signal.action} ${signal.token}
                {signal.leverage && (
                  <span style={{ color: '#737373', fontSize: '36px' }}>
                    {' '}{signal.leverage}x
                  </span>
                )}
              </div>
              <div
                style={{
                  color: '#737373',
                  fontSize: '24px',
                  marginTop: '8px',
                }}
              >
                Entry: ${signal.entry_price}
                {signal.exit_price && ` | Exit: $${signal.exit_price}`}
              </div>
            </div>
            
            {signal.pnlPct !== null && (
              <div
                style={{
                  marginLeft: 'auto',
                  textAlign: 'right',
                }}
              >
                <div
                  style={{
                    color: pnlColor,
                    fontSize: '72px',
                    fontWeight: 'bold',
                    lineHeight: '1',
                  }}
                >
                  {signal.pnlPct > 0 ? '+' : ''}{signal.pnlPct.toFixed(1)}%
                </div>
                <div
                  style={{
                    color: '#737373',
                    fontSize: '20px',
                  }}
                >
                  PnL
                </div>
              </div>
            )}
          </div>

          {/* Reasoning */}
          {signal.reasoning && (
            <div
              style={{
                backgroundColor: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                padding: '32px',
                marginBottom: '32px',
                width: '100%',
              }}
            >
              <div
                style={{
                  color: '#737373',
                  fontSize: '18px',
                  marginBottom: '12px',
                }}
              >
                Reasoning
              </div>
              <div
                style={{
                  color: '#e5e5e5',
                  fontSize: '24px',
                  lineHeight: '1.4',
                }}
              >
                "{signal.reasoning}"
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                backgroundColor: '#111',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#737373', fontSize: '14px', marginBottom: '4px' }}>
                Provider
              </div>
              <div style={{ color: '#e5e5e5', fontSize: '18px', fontWeight: '600' }}>
                {signal.provider_name}
              </div>
            </div>
            
            {signal.confidence && (
              <div
                style={{
                  backgroundColor: '#111',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ color: '#737373', fontSize: '14px', marginBottom: '4px' }}>
                  Confidence
                </div>
                <div style={{ color: '#e5e5e5', fontSize: '18px', fontWeight: '600' }}>
                  {Math.round(signal.confidence * 100)}%
                </div>
              </div>
            )}
            
            <div
              style={{
                backgroundColor: '#111',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#737373', fontSize: '14px', marginBottom: '4px' }}>
                Status
              </div>
              <div style={{ color: '#e5e5e5', fontSize: '18px', fontWeight: '600' }}>
                {signal.status === 'open' ? '🔄 Open' : '✅ Closed'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '1px solid #2a2a2a',
              paddingTop: '24px',
            }}
          >
            <div
              style={{
                color: '#22c55e',
                fontSize: '32px',
                fontWeight: 'bold',
              }}
            >
              bankrsignals.com
            </div>
            <div
              style={{
                color: '#737373',
                fontSize: '18px',
              }}
            >
              {new Date(signal.created_at).toLocaleDateString()}
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
    return new Response('Failed to generate image', { status: 500 });
  }
}