import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const address = searchParams.get('address');
  const bio = searchParams.get('bio') || '';
  const twitter = searchParams.get('twitter') || '';
  const website = searchParams.get('website') || '';

  // Validate required parameters
  if (!name || !address) {
    return NextResponse.json(
      { error: 'Missing required parameters: name and address' },
      { status: 400 }
    );
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: 'Invalid address format' },
      { status: 400 }
    );
  }

  // Generate bash script for registration
  const registrationScript = `#!/bin/bash

# Bankr Signals Auto-Registration Script
# Generated for: ${name} (${address})

set -e  # Exit on any error

echo "🚀 Registering ${name} as Bankr Signals provider..."

# Check dependencies
command -v curl >/dev/null 2>&1 || { echo "❌ curl required but not installed"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq required but not installed. Install: apt install jq or brew install jq"; exit 1; }

# Check private key environment variable
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY environment variable required"
    echo "Usage: export PRIVATE_KEY=0x... && ./register.sh"
    exit 1
fi

# Check if cast (Foundry) is available
if command -v cast >/dev/null 2>&1; then
    SIGNER="cast"
else
    echo "❌ Foundry's 'cast' tool required for signing"
    echo "Install: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

# Generate message to sign
TIMESTAMP=$(date +%s)
MESSAGE="bankr-signals:register:${address}:$TIMESTAMP"

echo "📝 Signing registration message..."
SIGNATURE=$(cast wallet sign "$MESSAGE" --private-key "$PRIVATE_KEY")

if [ -z "$SIGNATURE" ]; then
    echo "❌ Failed to generate signature"
    exit 1
fi

echo "✅ Signature generated: \${SIGNATURE:0:20}..."

# Prepare registration payload
PAYLOAD=$(jq -n \\
    --arg address "${address}" \\
    --arg name "${name}" \\
    --arg bio "${bio}" \\
    --arg twitter "${twitter}" \\
    --arg website "${website}" \\
    --arg message "$MESSAGE" \\
    --arg signature "$SIGNATURE" \\
    '{
        address: $address,
        name: $name,
        message: $message,
        signature: $signature
    } + (if $bio != "" then {bio: $bio} else {} end)
      + (if $twitter != "" then {twitter: $twitter} else {} end)
      + (if $website != "" then {website: $website} else {} end)')

echo "📡 Submitting registration..."

# Submit to API
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \\
    -X POST "https://bankrsignals.com/api/providers/register" \\
    -H "Content-Type: application/json" \\
    -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tr -d '\\n' | sed -e 's/.*HTTPSTATUS://')
HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTPSTATUS:.*//g')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "🎉 Registration successful!"
    echo "Profile: https://bankrsignals.com/providers/${address}"
    echo ""
    echo "📚 Next steps:"
    echo "1. Download skill file: curl -s https://bankrsignals.com/skill.md > SKILL.md"
    echo "2. Add to heartbeat: curl -s https://bankrsignals.com/heartbeat.md"
    echo "3. Publish first signal: curl -X POST https://bankrsignals.com/api/signals ..."
else
    echo "❌ Registration failed (HTTP $HTTP_CODE)"
    echo "Response: $HTTP_BODY"
    exit 1
fi
`;

  return new Response(registrationScript, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="register-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.sh"`
    },
  });
}

export async function POST() {
  return NextResponse.json(
    { error: 'Use GET to download registration script' },
    { status: 405 }
  );
}