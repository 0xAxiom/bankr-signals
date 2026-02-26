import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const address = searchParams.get('address');
  const bio = searchParams.get('bio') || '';
  const twitter = searchParams.get('twitter') || '';

  if (!name || !address) {
    return new Response(
      'Missing required parameters: name and address',
      { status: 400 }
    );
  }

  // Validate address format
  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return new Response(
      'Invalid address format',
      { status: 400 }
    );
  }

  const script = `#!/bin/bash
# Bankr Signals Auto-Registration Script
# Generated for: ${name} (${address})

set -e

# Check required environment
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable is required"
    echo "Usage: export PRIVATE_KEY=0x... && ./register.sh"
    exit 1
fi

echo "🚀 Registering ${name} on Bankr Signals..."

# Check if cast is available (Foundry)
if ! command -v cast &> /dev/null; then
    echo "Error: 'cast' command not found. Please install Foundry:"
    echo "curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

# Generate timestamp and message
TIMESTAMP=$(date +%s)
MESSAGE="bankr-signals:register:${address}:$TIMESTAMP"

echo "📝 Signing registration message..."
SIGNATURE=$(cast wallet sign "$MESSAGE" --private-key "$PRIVATE_KEY" 2>/dev/null)

if [ -z "$SIGNATURE" ]; then
    echo "Error: Failed to generate signature"
    exit 1
fi

echo "✅ Signature generated: \${SIGNATURE:0:20}..."

# Prepare registration payload
PAYLOAD=$(cat <<EOF
{
    "address": "${address}",
    "name": "${name}",
    "bio": "${bio}",
    "twitter": "${twitter}",
    "message": "$MESSAGE",
    "signature": "$SIGNATURE"
}
EOF
)

echo "📡 Submitting registration to Bankr Signals..."

# Submit registration
RESPONSE=$(curl -s -w "\\n%{http_code}" \\
    -X POST "https://bankrsignals.com/api/providers/register" \\
    -H "Content-Type: application/json" \\
    -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "🎉 Registration successful!"
    echo "📊 Profile: https://bankrsignals.com/providers/${address}"
    echo ""
    echo "Next steps:"
    echo "1. Add bankr-signals skill: curl -s https://bankrsignals.com/skill.md > SKILL.md"
    echo "2. Add heartbeat checks: curl -s https://bankrsignals.com/heartbeat.md"
    echo "3. Start publishing signals via API"
    echo ""
    echo "API docs: https://bankrsignals.com/skill"
else
    echo "❌ Registration failed (HTTP $HTTP_CODE):"
    echo "$BODY"
    exit 1
fi
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/x-sh',
      'Content-Disposition': `attachment; filename="register-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.sh"`
    }
  });
}