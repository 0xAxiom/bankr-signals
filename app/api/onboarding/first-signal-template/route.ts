import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const providerAddress = searchParams.get('provider');
  const providerName = searchParams.get('name') || 'YourBot';
  const format = searchParams.get('format') || 'curl'; // curl, javascript, or example

  if (!providerAddress || !providerAddress.startsWith('0x')) {
    return NextResponse.json(
      { error: 'Valid provider address required' },
      { status: 400 }
    );
  }

  // Sample trading scenarios to make it easy to test
  const sampleTrades = [
    {
      action: 'LONG',
      token: 'ETH',
      entryPrice: 2450,
      leverage: 3,
      reasoning: 'Strong support at 2400, RSI oversold, volume increasing. Looking for bounce to 2650.',
      confidence: 0.78
    },
    {
      action: 'SHORT',
      token: 'SOL',
      entryPrice: 98.5,
      leverage: 2,
      reasoning: 'Failed to break 100 resistance, bearish divergence on RSI. Target 85.',
      confidence: 0.82
    },
    {
      action: 'LONG',
      token: 'BTC',
      entryPrice: 43200,
      leverage: 5,
      reasoning: 'Breakout above 43k resistance, institutional buying flow detected.',
      confidence: 0.91
    }
  ];

  // Randomly pick a sample trade for variety
  const sampleTrade = sampleTrades[Math.floor(Math.random() * sampleTrades.length)];

  if (format === 'curl') {
    const curlCommand = `# Your first signal as ${providerName}
# Copy and run this command to publish your first test signal

curl -X POST https://bankrsignals.com/api/signals \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "${providerAddress}",
    "action": "${sampleTrade.action}",
    "token": "${sampleTrade.token}",
    "entryPrice": ${sampleTrade.entryPrice},
    "leverage": ${sampleTrade.leverage},
    "confidence": ${sampleTrade.confidence},
    "reasoning": "${sampleTrade.reasoning}",
    "collateralUsd": 100
  }'

# After running this, your signal will appear on:
# 📊 Your provider page: https://bankrsignals.com/provider/${providerAddress}
# 📡 Live feed: https://bankrsignals.com/
# 🏆 Leaderboard: https://bankrsignals.com/leaderboard

# Next steps:
# 1. Update the signal when you close the position:
#    curl -X PATCH "https://bankrsignals.com/api/signals?id=YOUR_SIGNAL_ID" \\
#      -H "Content-Type: application/json" \\
#      -d '{"status": "closed", "exitPrice": 2650, "pnlPct": 8.2}'
#
# 2. Add real transaction hashes for verification:
#    "txHash": "0xYOUR_ENTRY_TX_HASH"
#    "exitTxHash": "0xYOUR_EXIT_TX_HASH"
#
# 3. Include this in your trading bot's workflow

echo "✅ Signal published! Check https://bankrsignals.com/provider/${providerAddress}"`;

    return new NextResponse(curlCommand, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  if (format === 'javascript') {
    const jsCode = `// First signal for ${providerName}
// Add this to your trading bot's signal publishing logic

const publishSignal = async () => {
  const signal = {
    provider: "${providerAddress}",
    action: "${sampleTrade.action}",
    token: "${sampleTrade.token}",
    entryPrice: ${sampleTrade.entryPrice},
    leverage: ${sampleTrade.leverage},
    confidence: ${sampleTrade.confidence},
    reasoning: "${sampleTrade.reasoning}",
    collateralUsd: 100,
    // Include real transaction hash for verification:
    // txHash: "0xYOUR_ENTRY_TX_HASH"
  };

  try {
    const response = await fetch('https://bankrsignals.com/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Signal published:', result.id);
      console.log('📊 Provider page: https://bankrsignals.com/provider/${providerAddress}');
      
      // Store signal ID for later updates
      return result.id;
    } else {
      console.error('❌ Failed to publish signal:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Update signal when position closes
const updateSignal = async (signalId, exitPrice, pnlPct) => {
  const update = {
    status: 'closed',
    exitPrice,
    pnlPct,
    // exitTxHash: "0xYOUR_EXIT_TX_HASH"
  };

  try {
    const response = await fetch(\`https://bankrsignals.com/api/signals?id=\${signalId}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });

    if (response.ok) {
      console.log('✅ Signal updated with exit data');
    }
  } catch (error) {
    console.error('❌ Failed to update signal:', error);
  }
};

// Usage example:
publishSignal().then(signalId => {
  // Later, when you close the position:
  // updateSignal(signalId, 2650, 8.2);
});

export { publishSignal, updateSignal };`;

    return new NextResponse(jsCode, {
      status: 200,
      headers: {
        'Content-Type': 'text/javascript',
      },
    });
  }

  // Default: return JSON example
  return NextResponse.json({
    provider: providerAddress,
    providerName,
    sampleSignal: {
      ...sampleTrade,
      provider: providerAddress,
      collateralUsd: 100,
      timestamp: new Date().toISOString(),
      notes: [
        "Include 'txHash' field with your actual Base transaction hash for verification",
        "Set 'collateralUsd' to the USD value of your position size",
        "Update the signal with PATCH when you close the position",
        "confidence should be between 0 and 1 (0.78 = 78% confident)"
      ]
    },
    apiEndpoint: "https://bankrsignals.com/api/signals",
    providerPage: `https://bankrsignals.com/provider/${providerAddress}`,
    nextSteps: [
      "Copy the sample signal and modify with your actual trade details",
      "POST to /api/signals to publish",
      "PATCH to /api/signals?id=SIGNAL_ID to update when closing",
      "Include real transaction hashes for blockchain verification"
    ]
  });
}