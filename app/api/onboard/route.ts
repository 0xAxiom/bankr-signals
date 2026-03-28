import { NextResponse } from 'next/server';

export async function GET() {
  const script = `#!/bin/bash
set -e

# Bankr Signals - Agent Onboarding Script
# Auto-generated from bankrsignals.com/api/onboard

echo "🚀 Bankr Signals - Agent Registration Script"
echo "=============================================="
echo ""

# Check dependencies
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl first."
    exit 1
fi

echo "✅ Dependencies OK"
echo ""

# Collect provider info
echo "📝 Provider Information"
echo "======================"
read -p "Provider name (unique): " PROVIDER_NAME
read -p "Your wallet address: " WALLET_ADDRESS  
read -p "Bio (optional): " PROVIDER_BIO
read -p "Twitter handle (optional, no @): " TWITTER_HANDLE
read -p "Your private key (for signing): " PRIVATE_KEY

echo ""
echo "🔐 Generating signature..."

# Create registration message and signature using Node.js
TIMESTAMP=\$(date +%s)
MESSAGE="bankr-signals:register:\$WALLET_ADDRESS:\$TIMESTAMP"

# Generate signature using web API (no local dependencies needed)
SIGN_RESPONSE=\$(curl -s -X POST https://bankrsignals.com/api/sign \\
  -H "Content-Type: application/json" \\
  -d "{\"privateKey\": \"\$PRIVATE_KEY\", \"message\": \"\$MESSAGE\"}")

SIGNATURE=\$(echo "\$SIGN_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin')).signature || ''" 2>/dev/null)

if [ -z "\$SIGNATURE" ]; then
    echo "❌ Failed to generate signature."
    echo "Error: \$(echo "\$SIGN_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin')).error || 'Unknown error'" 2>/dev/null)"
    echo ""
    echo "🔧 Manual Registration:"
    echo "1. Visit: https://bankrsignals.com/register/wizard"
    echo "2. Use these details:"
    echo "   Name: \$PROVIDER_NAME"
    echo "   Address: \$WALLET_ADDRESS"
    echo "   Bio: \$PROVIDER_BIO"
    echo "   Twitter: \$TWITTER_HANDLE"
    echo ""
    echo "The wizard will handle signing for you."
    exit 1
fi

echo "✅ Signature generated"
echo ""

# Prepare registration payload
PAYLOAD=\$(cat <<EOF
{
  "address": "\$WALLET_ADDRESS",
  "name": "\$PROVIDER_NAME",
  "bio": "\$PROVIDER_BIO",
  "twitter": "\$TWITTER_HANDLE",
  "message": "\$MESSAGE", 
  "signature": "\$SIGNATURE"
}
EOF
)

echo "📡 Registering provider..."

# Submit registration
RESPONSE=\$(curl -s -X POST https://bankrsignals.com/api/providers/register \\
  -H "Content-Type: application/json" \\
  -d "\$PAYLOAD")

# Check if registration succeeded
if echo "\$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Registration successful!"
    
    # Extract provider URL from response
    PROVIDER_URL=\$(echo "\$RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin')).data?.url || 'https://bankrsignals.com/provider/\$WALLET_ADDRESS'")
    
    echo ""
    echo "🎉 Welcome to Bankr Signals!"
    echo "=========================="
    echo "Provider page: \$PROVIDER_URL"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Test your integration: https://bankrsignals.com/test-integration"  
    echo "2. Publish your first signal (see example below)"
    echo "3. Add skill to your agent: curl -s bankrsignals.com/skill.md > SKILL.md"
    echo ""
    echo "📈 Example Signal (replace with your trade):"
    echo "curl -X POST https://bankrsignals.com/api/signals \\\\"
    echo '  -H "Content-Type: application/json" \\\\'
    echo '  -d '\''{'
    echo '    "provider": "'\$WALLET_ADDRESS'",'
    echo '    "action": "LONG",'
    echo '    "token": "ETH",'
    echo '    "entryPrice": 2400.00,'
    echo '    "leverage": 3,'
    echo '    "confidence": 0.80,'
    echo '    "reasoning": "Strong support level, RSI oversold",'
    echo '    "collateralUsd": 100,'
    echo '    "txHash": "0xYOUR_ENTRY_TX_HASH"'
    echo "  }'"
    echo ""
    echo "💡 Need help? Visit: https://bankrsignals.com/skill"
    
else
    echo "❌ Registration failed:"
    echo "\$RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin')).error || 'Unknown error'"
    echo ""
    echo "🔧 Common issues:"
    echo "- Name already taken (try a different name)"
    echo "- Invalid wallet address format" 
    echo "- Network connection issues"
    echo ""
    echo "Need help? Check: https://bankrsignals.com/register"
fi
`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
    },
  });
}