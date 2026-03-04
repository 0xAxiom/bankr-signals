import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { createErrorResponse, APIErrorCode } from '@/lib/api-utils';
import { supabase } from '@/lib/db';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: signalId } = await params;
    
    // Fetch signal and provider data
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .select(`
        *,
        signal_providers (
          name,
          avatar,
          verified
        )
      `)
      .eq('id', signalId)
      .single();

    if (signalError || !signal) {
      return createErrorResponse(
        APIErrorCode.NOT_FOUND,
        'Signal not found',
        404
      );
    }

    const provider = signal.signal_providers;
    
    // Format signal data for card
    const action = signal.action;
    const token = signal.token;
    const leverage = signal.leverage ? `${signal.leverage}x ` : '';
    const entryPrice = signal.entry_price < 0.01 
      ? signal.entry_price.toExponential(2)
      : signal.entry_price.toLocaleString();
    
    // PnL formatting
    let pnlText = '';
    let pnlColor = 'text-white';
    if (signal.pnl_pct !== null) {
      const pnl = signal.pnl_pct;
      pnlText = `${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}%`;
      pnlColor = pnl > 0 ? 'text-green-400' : 'text-red-400';
    } else if (signal.status === 'open') {
      pnlText = 'LIVE';
      pnlColor = 'text-orange-400';
    }

    // Status badge
    const status = signal.status.toUpperCase();
    const statusColor = signal.status === 'open' ? 'bg-orange-500' : 'bg-gray-600';

    // Provider name with verification
    const providerName = provider.name + (provider.verified ? ' ✓' : '');
    
    // Date formatting
    const date = new Date(signal.timestamp).toLocaleDateString();
    
    // Generate unique filename
    const filename = `signal-card-${signalId}-${Date.now()}.png`;
    const outputPath = `/tmp/${filename}`;
    
    // Confidence text
    const confidenceText = signal.confidence 
      ? `${Math.round(signal.confidence * 100)}% confidence`
      : '';

    // Reasoning snippet (truncated)
    const reasoning = signal.reasoning && signal.reasoning.length > 120
      ? signal.reasoning.substring(0, 117) + '...'
      : signal.reasoning || '';

    // Build HTML card content
    const cardHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      font-family: 'Inter', sans-serif;
      color: white;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    .header {
      padding: 32px 40px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .provider-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .provider-name {
      font-size: 24px;
      font-weight: 600;
      color: #e5e5e5;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      font-family: 'JetBrains Mono', monospace;
      color: white;
    }
    .signal-main {
      flex: 1;
      padding: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .signal-details {
      flex: 1;
    }
    .signal-action {
      font-size: 72px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 8px;
    }
    .long { color: #22c55e; }
    .short { color: #ef4444; }
    .buy { color: #22c55e; }
    .sell { color: #ef4444; }
    .token-price {
      font-size: 36px;
      font-weight: 600;
      color: #e5e5e5;
      margin-bottom: 20px;
      font-family: 'JetBrains Mono', monospace;
    }
    .signal-meta {
      display: flex;
      gap: 32px;
      font-size: 16px;
      color: #999;
    }
    .pnl-section {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 16px;
    }
    .pnl-value {
      font-size: 64px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .pnl-green { color: #22c55e; }
    .pnl-red { color: #ef4444; }
    .pnl-orange { color: #f59e0b; }
    .reasoning {
      max-width: 400px;
      font-size: 16px;
      line-height: 1.4;
      color: #b0b0b0;
      font-style: italic;
    }
    .footer {
      padding: 24px 40px;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .date {
      font-size: 16px;
      color: #666;
    }
    .branding {
      font-size: 18px;
      font-weight: 600;
      color: #22c55e;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="provider-info">
      <div class="provider-name">${providerName}</div>
      <div class="status-badge" style="background: ${statusColor}20; color: ${statusColor === 'bg-orange-500' ? '#f59e0b' : '#9ca3af'}">${status}</div>
    </div>
  </div>
  
  <div class="signal-main">
    <div class="signal-details">
      <div class="signal-action ${action.toLowerCase()}">${leverage}${action}</div>
      <div class="token-price">${token} @ $${entryPrice}</div>
      <div class="signal-meta">
        ${confidenceText && `<div>${confidenceText}</div>`}
        <div>${date}</div>
      </div>
      ${reasoning && `<div class="reasoning">"${reasoning}"</div>`}
    </div>
    
    ${pnlText && `
    <div class="pnl-section">
      <div class="pnl-value ${pnlColor.replace('text-', 'pnl-')}">${pnlText}</div>
    </div>
    `}
  </div>
  
  <div class="footer">
    <div class="date">Signal ID: ${signalId.substring(0, 8)}...</div>
    <div class="branding">bankrsignals.com</div>
  </div>
</body>
</html>`;

    // Write HTML to temp file
    const htmlPath = `/tmp/signal-card-${signalId}-${Date.now()}.html`;
    await require('fs/promises').writeFile(htmlPath, cardHTML);

    // Generate image with Playwright
    const command = `npx playwright screenshot --wait-for-timeout 1000 --viewport-size 1200,630 "${htmlPath}" "${outputPath}"`;
    await execAsync(command);

    // Read and return the image
    const imageBuffer = await readFile(outputPath);

    // Clean up temp files
    try {
      await require('fs/promises').unlink(htmlPath);
      await require('fs/promises').unlink(outputPath);
    } catch (e) {
      // Ignore cleanup errors
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error: any) {
    console.error('Signal card generation error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to generate signal card',
      500
    );
  }
}