import { ImageResponse } from '@vercel/og';
import { NextResponse } from 'next/server';
import { createErrorResponse, APIErrorCode } from '@/lib/api-utils';
import { promisify } from 'util';
import { exec } from 'child_process';
import { readFile } from 'fs/promises';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    // Get signal parameters from URL
    const action = params.get('action') || '';
    const token = params.get('token') || '';
    const entry = params.get('entry') || '';
    const provider = params.get('provider') || '';
    const status = params.get('status') || '';
    const pnlParam = params.get('pnl');
    const leverage = params.get('leverage');
    const reasoning = params.get('reasoning');
    const txHash = params.get('tx');
    const size = params.get('size');
    
    if (!action || !token || !provider) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        'Missing required parameters: action, token, provider',
        400
      );
    }

    // Format price for display
    function formatPrice(price: string): string {
      const num = parseFloat(price);
      if (isNaN(num)) return price;
      if (num >= 1) return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (num >= 0.01) return num.toFixed(4);
      if (num > 0) {
        const str = num.toFixed(20);
        const decimals = str.split('.')[1] || '';
        let leadingZeros = 0;
        for (const ch of decimals) {
          if (ch === '0') leadingZeros++;
          else break;
        }
        const totalDigits = leadingZeros + 3;
        return num.toFixed(totalDigits).replace(/0+$/, '');
      }
      return '0';
    }

    // Determine action color and formatting
    const isLong = action === 'BUY' || action === 'LONG';
    const actionColor = isLong ? '#22c55e' : '#ef4444';
    const actionBg = isLong ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    
    // Format PnL
    let pnlDisplay = '';
    let pnlColor = '#f59e0b'; // Orange for open
    if (pnlParam !== null && pnlParam !== undefined) {
      const pnl = parseFloat(pnlParam);
      if (!isNaN(pnl)) {
        pnlDisplay = `${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}%`;
        pnlColor = pnl >= 0 ? '#22c55e' : '#ef4444';
      }
    } else if (status === 'open') {
      pnlDisplay = 'LIVE';
      pnlColor = '#f59e0b';
    }

    // Status indicator
    const statusDisplay = status.toUpperCase();
    const statusColor = status === 'open' ? '#f59e0b' : status === 'closed' ? '#22c55e' : '#ef4444';
    
    // Verification status
    const verified = txHash ? '✓ VERIFIED' : 'UNVERIFIED';
    const verifiedColor = txHash ? '#22c55e' : '#6b7280';
    
    // Truncate reasoning for OG display
    const reasoningShort = reasoning && reasoning.length > 100 
      ? reasoning.substring(0, 97) + '...'
      : reasoning || '';

    // Generate unique filename
    const filename = `og-signal-${Date.now()}.png`;
    const outputPath = `/tmp/${filename}`;
    
    // Build HTML for OG image (1200x630 for Twitter/Facebook)
    const ogHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
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
    
    /* Background decoration */
    body::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, ${actionColor}20 0%, transparent 70%);
      border-radius: 50%;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 40px 48px 32px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      position: relative;
      z-index: 10;
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .brand-logo {
      width: 32px;
      height: 32px;
      background: ${actionColor};
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      color: #0a0a0a;
    }
    
    .brand-text {
      font-size: 20px;
      font-weight: 600;
      color: #e5e5e5;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .status-area {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .status-badge {
      padding: 6px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      background: rgba(245, 158, 11, 0.15);
      color: ${statusColor};
      border: 1px solid ${statusColor}40;
    }
    
    .verified {
      font-size: 12px;
      font-weight: 500;
      color: ${verifiedColor};
      font-family: 'JetBrains Mono', monospace;
    }
    
    .main {
      flex: 1;
      padding: 40px 48px;
      display: flex;
      align-items: center;
      gap: 60px;
      position: relative;
      z-index: 10;
    }
    
    .signal-info {
      flex: 1;
    }
    
    .action-token {
      display: flex;
      align-items: baseline;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .action {
      font-size: 72px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: ${actionColor};
      line-height: 1;
    }
    
    .token {
      font-size: 48px;
      font-weight: 700;
      color: #e5e5e5;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .leverage-badge {
      background: ${actionBg};
      color: ${actionColor};
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      border: 1px solid ${actionColor}40;
    }
    
    .entry-price {
      font-size: 28px;
      font-weight: 600;
      color: #b0b0b0;
      margin-bottom: 24px;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .meta-info {
      display: flex;
      gap: 32px;
      margin-bottom: 20px;
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .meta-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 500;
    }
    
    .meta-value {
      font-size: 16px;
      color: #e5e5e5;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .reasoning-text {
      font-size: 16px;
      line-height: 1.5;
      color: #999;
      font-style: italic;
      max-width: 500px;
    }
    
    .pnl-section {
      text-align: center;
      padding: 32px;
    }
    
    .pnl-value {
      font-size: 86px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
      color: ${pnlColor};
      line-height: 1;
      margin-bottom: 8px;
      text-shadow: 0 0 30px ${pnlColor}40;
    }
    
    .pnl-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 500;
    }
    
    .footer {
      padding: 24px 48px;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0,0,0,0.3);
    }
    
    .provider-name {
      font-size: 18px;
      font-weight: 600;
      color: #e5e5e5;
    }
    
    .url {
      font-size: 16px;
      color: #666;
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-logo">₿</div>
      <div class="brand-text">bankr signals</div>
    </div>
    <div class="status-area">
      <div class="verified">${verified}</div>
      <div class="status-badge">${statusDisplay}</div>
    </div>
  </div>
  
  <div class="main">
    <div class="signal-info">
      <div class="action-token">
        <div class="action">${action}</div>
        <div class="token">${token}</div>
        ${leverage ? `<div class="leverage-badge">${leverage}x</div>` : ''}
      </div>
      
      <div class="entry-price">@ $${formatPrice(entry)}</div>
      
      <div class="meta-info">
        <div class="meta-item">
          <div class="meta-label">Provider</div>
          <div class="meta-value">${provider}</div>
        </div>
        ${size ? `
        <div class="meta-item">
          <div class="meta-label">Size</div>
          <div class="meta-value">$${size}</div>
        </div>
        ` : ''}
      </div>
      
      ${reasoningShort ? `
      <div class="reasoning-text">"${reasoningShort}"</div>
      ` : ''}
    </div>
    
    ${pnlDisplay ? `
    <div class="pnl-section">
      <div class="pnl-value">${pnlDisplay}</div>
      <div class="pnl-label">${status === 'open' ? 'Live PnL' : 'Final PnL'}</div>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <div class="provider-name">by ${provider}</div>
    <div class="url">bankrsignals.com</div>
  </div>
</body>
</html>`;

    // Write HTML to temp file
    const htmlPath = `/tmp/og-signal-${Date.now()}.html`;
    await require('fs/promises').writeFile(htmlPath, ogHTML);

    // Generate image with Playwright (1200x630 for social media)
    const command = `npx playwright screenshot --wait-for-timeout 1000 --viewport-size 1200,630 "${htmlPath}" "${outputPath}"`;
    await execAsync(command);

    // Read the generated image
    const imageBuffer = await readFile(outputPath);

    // Clean up temp files
    try {
      await require('fs/promises').unlink(htmlPath);
      await require('fs/promises').unlink(outputPath);
    } catch (e) {
      // Ignore cleanup errors
      console.warn('Failed to clean up temp files:', e);
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=7200', // Cache for 2 hours
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('OG image generation error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to generate OG image',
      500
    );
  }
}