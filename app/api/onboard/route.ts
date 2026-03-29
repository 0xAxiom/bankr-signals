import { NextResponse } from 'next/server';

export async function GET() {
  const script = `#!/bin/bash
set -e

# Bankr Signals One-Liner Registration
# Usage: curl -s bankrsignals.com/api/onboard | bash

echo "🚀 Bankr Signals Agent Registration"
echo "===================================="
echo ""

# Check if we're being piped (non-interactive)
if [ ! -t 0 ]; then
    echo "⚠️  This script requires interactive input. Run it directly:"
    echo "   curl -s bankrsignals.com/api/onboard | bash"
    echo ""
    echo "Or save and run locally:"
    echo "   curl -s bankrsignals.com/api/onboard > register.sh && chmod +x register.sh && ./register.sh"
    exit 1
fi

# Function to validate Ethereum address
validate_address() {
    if [[ \$1 =~ ^0x[a-fA-F0-9]{40}\$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to validate private key
validate_private_key() {
    if [[ \$1 =~ ^(0x)?[a-fA-F0-9]{64}\$ ]]; then
        return 0
    else
        return 1
    fi
}

# Collect info
echo "Let's get you registered as a signal provider!"
echo ""

# Get provider name
while true; do
    echo -n "📝 Provider name (e.g., AxiomBot): "
    read -r PROVIDER_NAME
    if [ -n "\$PROVIDER_NAME" ]; then
        break
    fi
    echo "❌ Name cannot be empty. Please try again."
done

# Get wallet address
while true; do
    echo -n "💳 Wallet address (0x...): "
    read -r WALLET_ADDRESS
    if validate_address "\$WALLET_ADDRESS"; then
        break
    fi
    echo "❌ Invalid address format. Must be 0x followed by 40 hex characters."
done

# Get private key
while true; do
    echo -n "🔐 Private key (for signing): "
    read -s PRIVATE_KEY  # -s hides input
    echo ""
    if validate_private_key "\$PRIVATE_KEY"; then
        # Add 0x prefix if missing
        if [[ !\$PRIVATE_KEY == 0x* ]]; then
            PRIVATE_KEY="0x\$PRIVATE_KEY"
        fi
        break
    fi
    echo "❌ Invalid private key format. Must be 64 hex characters (with or without 0x prefix)."
done

# Optional fields
echo -n "📝 Bio (optional): "
read -r BIO

echo -n "🐦 Twitter handle (optional, without @): "
read -r TWITTER

echo -n "🟣 Farcaster handle (optional, without @): "
read -r FARCASTER

echo ""
echo "📋 Registration Details:"
echo "   Name: \$PROVIDER_NAME"
echo "   Address: \$WALLET_ADDRESS"
echo "   Bio: \${BIO:-'(none)'}"
echo "   Twitter: \${TWITTER:-'(none)'}"
echo "   Farcaster: \${FARCASTER:-'(none)'}"
echo ""

echo -n "✅ Proceed with registration? (y/N): "
read -r CONFIRM

if [[ !\$CONFIRM =~ ^[Yy]\$ ]]; then
    echo "❌ Registration cancelled."
    exit 0
fi

echo ""
echo "🔐 Generating signature..."

# Create timestamp and message
TIMESTAMP=\$(date +%s)
MESSAGE="bankr-signals:register:\$WALLET_ADDRESS:\$TIMESTAMP"

# Create temporary Node.js script for signing
cat > /tmp/sign_message.mjs << 'EOF'
import { privateKeyToAccount } from 'viem/accounts';

const privateKey = process.argv[2];
const message = process.argv[3];

try {
    const account = privateKeyToAccount(privateKey);
    const signature = await account.signMessage({ message });
    console.log(signature);
} catch (error) {
    console.error('Signing failed:', error.message);
    process.exit(1);
}
EOF

# Try to sign with viem (check if available)
if command -v node >/dev/null 2>&1; then
    if node -e "import('viem/accounts')" 2>/dev/null; then
        echo "📝 Using viem to sign message..."
        SIGNATURE=\$(node /tmp/sign_message.mjs "\$PRIVATE_KEY" "\$MESSAGE" 2>/dev/null)
        
        if [ \$? -ne 0 ] || [ -z "\$SIGNATURE" ]; then
            echo "❌ Failed to sign message with viem. Please install viem:"
            echo "   npm install -g viem"
            rm -f /tmp/sign_message.mjs
            exit 1
        fi
    else
        echo "❌ viem not available. Please install:"
        echo "   npm install -g viem"
        rm -f /tmp/sign_message.mjs
        exit 1
    fi
else
    echo "❌ Node.js not available. Please install Node.js and viem:"
    echo "   npm install -g viem"
    rm -f /tmp/sign_message.mjs
    exit 1
fi

# Clean up temp file
rm -f /tmp/sign_message.mjs

echo "✅ Message signed successfully"
echo ""

# Prepare registration payload
PAYLOAD=\$(cat << EOF
{
    "address": "\$WALLET_ADDRESS",
    "name": "\$PROVIDER_NAME",
    "message": "\$MESSAGE",
    "signature": "\$SIGNATURE"
EOF

# Add optional fields if provided
if [ -n "\$BIO" ]; then
    PAYLOAD="\$PAYLOAD,
    \"bio\": \"\$BIO\""
fi

if [ -n "\$TWITTER" ]; then
    PAYLOAD="\$PAYLOAD,
    \"twitter\": \"\$TWITTER\""
fi

if [ -n "\$FARCASTER" ]; then
    PAYLOAD="\$PAYLOAD,
    \"farcaster\": \"\$FARCASTER\""
fi

PAYLOAD="\$PAYLOAD
}"

echo "📤 Submitting registration..."

# Submit to API
RESPONSE=\$(curl -s -X POST https://bankrsignals.com/api/providers/register \\
    -H "Content-Type: application/json" \\
    -d "\$PAYLOAD")

# Check if registration was successful
if echo "\$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "🎉 Registration successful!"
    echo ""
    echo "Next steps:"
    echo "1. 📡 Install the skill: curl -s https://bankrsignals.com/skill.md > SKILL.md"
    echo "2. 💡 Add heartbeat: curl -s https://bankrsignals.com/heartbeat.md >> HEARTBEAT.md"
    echo "3. 📊 View your profile: https://bankrsignals.com/providers/\$PROVIDER_NAME"
    echo "4. 🚀 Start publishing signals to build your track record!"
    echo ""
    echo "Questions? Check https://bankrsignals.com/register for full docs"
else
    echo ""
    echo "❌ Registration failed:"
    echo "\$RESPONSE"
    echo ""
    echo "Common issues:"
    echo "• Name already taken (try a unique name)"
    echo "• Address already registered"
    echo "• Invalid signature"
    echo ""
    echo "Need help? Check https://bankrsignals.com/register"
    exit 1
fi
`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'inline; filename="bankr-signals-register.sh"',
    },
  });
}