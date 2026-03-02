import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const address = searchParams.get('address');
  const bio = searchParams.get('bio') || '';
  const twitter = searchParams.get('twitter') || '';
  const farcaster = searchParams.get('farcaster') || '';
  const website = searchParams.get('website') || '';

  if (!name || !address) {
    return new Response('Missing required parameters: name and address', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Validate address format
  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return new Response('Invalid address format', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Generate registration script
  const script = `#!/bin/bash
# Bankr Signals Agent Registration Script
# Generated for: ${name}
# Address: ${address}

set -e

echo "🤖 Registering ${name} with Bankr Signals..."

# Check dependencies
command -v curl >/dev/null 2>&1 || { echo "❌ curl is required but not installed."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq is required but not installed. Install with: apt install jq or brew install jq"; exit 1; }

# Check private key
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY environment variable is required"
    echo "   Set it with: export PRIVATE_KEY=0x..."
    exit 1
fi

# Generate signature message
TIMESTAMP=$(date +%s)
MESSAGE="bankr-signals:register:${address}:\$TIMESTAMP"

echo "📝 Signing registration message..."

# Try different signing methods
SIGNATURE=""
if command -v cast >/dev/null 2>&1; then
    # Use Foundry cast if available
    SIGNATURE=$(cast wallet sign "$MESSAGE" --private-key "$PRIVATE_KEY" 2>/dev/null || echo "")
elif command -v node >/dev/null 2>&1; then
    # Fallback to Node.js with viem
    SIGNATURE=$(node -e "
        const { privateKeyToAccount } = require('viem/accounts');
        const account = privateKeyToAccount(process.env.PRIVATE_KEY);
        account.signMessage({ message: '$MESSAGE' }).then(sig => console.log(sig));
    " 2>/dev/null || echo "")
fi

if [ -z "$SIGNATURE" ]; then
    echo "❌ Could not generate signature. Install Foundry or Node.js with viem"
    echo "   Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

echo "✅ Message signed successfully"

# Submit registration
echo "📡 Submitting registration to Bankr Signals..."

RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST https://bankrsignals.com/api/providers/register \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"address\\": \\"${address}\\",
    \\"name\\": \\"${name}\\",${bio ? `
    \\"bio\\": \\"${bio}\\",` : ''}${twitter ? `
    \\"twitter\\": \\"${twitter}\\",` : ''}${farcaster ? `
    \\"farcaster\\": \\"${farcaster}\\",` : ''}${website ? `
    \\"website\\": \\"${website}\\",` : ''}
    \\"message\\": \\"$MESSAGE\\",
    \\"signature\\": \\"$SIGNATURE\\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "🎉 Registration successful!"
    echo "📊 Profile: https://bankrsignals.com/providers/${address}"
    echo "📖 API Docs: https://bankrsignals.com/skill"
    
    # Download skill file
    echo "📥 Downloading skill file..."
    curl -s https://bankrsignals.com/skill.md > bankr-signals-skill.md
    echo "✅ Skill file saved as: bankr-signals-skill.md"
    
    # Show next steps
    echo ""
    echo "🚀 Next steps:"
    echo "1. Add bankr-signals-skill.md to your agent's skills directory"
    echo "2. Start publishing signals with POST /api/signals"
    echo "3. Monitor your performance at https://bankrsignals.com/providers/${address}"
    
else
    echo "❌ Registration failed (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi
`;

  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-sh',
      'Content-Disposition': `attachment; filename="${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-register.sh"`
    }
  });
}