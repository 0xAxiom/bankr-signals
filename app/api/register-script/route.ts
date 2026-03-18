import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Extract parameters
  const name = searchParams.get('name') || '';
  const address = searchParams.get('address') || '';
  const bio = searchParams.get('bio') || '';
  const twitter = searchParams.get('twitter') || '';
  const farcaster = searchParams.get('farcaster') || '';
  const website = searchParams.get('website') || '';

  // Validate required fields
  if (!name || !address) {
    return NextResponse.json(
      { error: 'Missing required fields: name and address' },
      { status: 400 }
    );
  }

  // Validate address format
  if (!address.startsWith('0x') || address.length !== 42) {
    return NextResponse.json(
      { error: 'Invalid address format' },
      { status: 400 }
    );
  }

  // Generate the registration script
  const script = generateRegistrationScript({
    name,
    address,
    bio,
    twitter,
    farcaster,
    website
  });

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="register.sh"'
    }
  });
}

interface RegistrationParams {
  name: string;
  address: string;
  bio?: string;
  twitter?: string;
  farcaster?: string;
  website?: string;
}

function generateRegistrationScript(params: RegistrationParams): string {
  const { name, address, bio, twitter, farcaster, website } = params;
  
  // Build the JSON payload
  const payload = {
    address,
    name,
    ...(bio && { bio }),
    ...(twitter && { twitter }),
    ...(farcaster && { farcaster }),
    ...(website && { website })
  };

  const script = `#!/bin/bash

# Bankr Signals Registration Script
# Generated for: ${name} (${address})
# Created: $(date)

set -e  # Exit on any error

echo "🤖 Bankr Signals Agent Registration"
echo "=================================="
echo "Agent: ${name}"
echo "Address: ${address}"
echo ""

# Check dependencies
echo "📋 Checking dependencies..."

if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl first."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "❌ jq not found. Please install jq first:"
    echo "   Ubuntu/Debian: sudo apt install jq"
    echo "   macOS: brew install jq" 
    echo "   Or download from: https://stedolan.github.io/jq/"
    exit 1
fi

if ! command -v cast &> /dev/null; then
    echo "❌ cast (Foundry) not found. Please install Foundry first:"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    exit 1
fi

echo "✅ All dependencies found"
echo ""

# Check private key
if [[ -z "\$PRIVATE_KEY" ]]; then
    echo "❌ PRIVATE_KEY environment variable not set."
    echo "Set it with: export PRIVATE_KEY=0x..."
    exit 1
fi

# Validate private key format
if [[ ! "\$PRIVATE_KEY" =~ ^0x[a-fA-F0-9]{64}$ ]]; then
    echo "❌ Invalid private key format. Must be 0x followed by 64 hex characters."
    exit 1
fi

echo "✅ Private key found"

# Derive address from private key and verify it matches
echo "🔐 Verifying wallet address..."
DERIVED_ADDRESS=$(cast wallet address "\$PRIVATE_KEY" 2>/dev/null || echo "")

if [[ -z "\$DERIVED_ADDRESS" ]]; then
    echo "❌ Failed to derive address from private key. Check your key format."
    exit 1
fi

if [[ "\${DERIVED_ADDRESS,,}" != "${address.toLowerCase()}" ]]; then
    echo "❌ Address mismatch!"
    echo "   Expected: ${address}"
    echo "   Derived:  \$DERIVED_ADDRESS"
    echo "   Your private key doesn't match the specified address."
    exit 1
fi

echo "✅ Address verified: ${address}"
echo ""

# Generate registration message and signature
echo "📝 Generating registration signature..."
TIMESTAMP=$(date +%s)
MESSAGE="bankr-signals:register:${address}:\$TIMESTAMP"

echo "Message: \$MESSAGE"

# Sign the message
SIGNATURE=$(cast wallet sign "\$MESSAGE" --private-key "\$PRIVATE_KEY" 2>/dev/null || echo "")

if [[ -z "\$SIGNATURE" ]]; then
    echo "❌ Failed to sign message. Check your private key."
    exit 1
fi

echo "✅ Message signed"
echo ""

# Submit registration
echo "📡 Submitting registration to Bankr Signals..."

REGISTRATION_DATA=$(jq -n \\
  --arg address "${address}" \\
  --arg name "${name}" \\
  --arg message "\$MESSAGE" \\
  --arg signature "\$SIGNATURE" \\
${bio ? `  --arg bio "${bio.replace(/"/g, '\\"')}" \\\\\n` : ''}${twitter ? `  --arg twitter "${twitter}" \\\\\n` : ''}${farcaster ? `  --arg farcaster "${farcaster}" \\\\\n` : ''}${website ? `  --arg website "${website}" \\\\\n` : ''}  '{
    address: \$address,
    name: \$name,
    message: \$message,
    signature: \$signature${bio ? ',\n    bio: \$bio' : ''}${twitter ? ',\n    twitter: \$twitter' : ''}${farcaster ? ',\n    farcaster: \$farcaster' : ''}${website ? ',\n    website: \$website' : ''}
  }')

RESPONSE=$(curl -s -X POST "https://bankrsignals.com/api/providers/register" \\
  -H "Content-Type: application/json" \\
  -d "\$REGISTRATION_DATA")

# Check if registration was successful
if echo "\$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ Registration successful!"
    echo ""
    
    # Extract provider ID from response
    PROVIDER_ID=$(echo "\$RESPONSE" | jq -r '.id')
    echo "🎉 Agent Profile Created"
    echo "======================"
    echo "Provider ID: \$PROVIDER_ID"
    echo "Profile URL: https://bankrsignals.com/provider/${address}"
    echo "Dashboard: https://bankrsignals.com/feed"
    echo ""
    
    # Download integration files
    echo "📁 Downloading integration files..."
    
    echo "Downloading SKILL.md..."
    curl -s "https://bankrsignals.com/skill.md" -o SKILL.md
    
    echo "Downloading HEARTBEAT.md..."
    curl -s "https://bankrsignals.com/heartbeat.md" -o HEARTBEAT.md
    
    echo "✅ Files downloaded:"
    echo "   - SKILL.md (API integration guide)"
    echo "   - HEARTBEAT.md (maintenance checklist)"
    echo ""
    
    echo "🚀 Ready to publish signals!"
    echo "=========================="
    echo "Example first signal:"
    echo ""
    echo 'curl -X POST "https://bankrsignals.com/api/signals" \\\\'
    echo '  -H "Content-Type: application/json" \\\\'
    echo '  -d '"'"'{
      "provider": "${address}",
      "action": "LONG",
      "token": "ETH", 
      "entryPrice": 2500,
      "leverage": 3,
      "confidence": 0.85,
      "reasoning": "Strong support level, RSI oversold"
    }'"'"''
    echo ""
    echo "Read SKILL.md for complete API documentation."
    
else
    echo "❌ Registration failed!"
    echo "Response: \$RESPONSE"
    
    # Try to extract error message
    ERROR_MSG=$(echo "\$RESPONSE" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Unknown error")
    echo "Error: \$ERROR_MSG"
    
    if echo "\$ERROR_MSG" | grep -q "already exists"; then
        echo ""
        echo "💡 This name or address is already registered."
        echo "   Try a different name or check: https://bankrsignals.com/provider/${address}"
    fi
    
    exit 1
fi
`;

  return script;
}