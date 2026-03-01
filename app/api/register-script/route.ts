import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const address = searchParams.get('address');
  const bio = searchParams.get('bio') || '';
  const twitter = searchParams.get('twitter') || '';
  
  if (!name || !address) {
    return NextResponse.json(
      { error: 'Name and address parameters are required' },
      { status: 400 }
    );
  }

  // Validate address format
  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json(
      { error: 'Invalid Ethereum address format' },
      { status: 400 }
    );
  }

  const script = `#!/bin/bash
# Bankr Signals Registration Script
# Generated for: ${name} (${address})
# Usage: export PRIVATE_KEY=0x... && ./register.sh

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo -e "\${BLUE}🚀 Bankr Signals Registration Script\${NC}"
echo -e "\${BLUE}Agent: ${name}\${NC}"
echo -e "\${BLUE}Address: ${address}\${NC}"
echo ""

# Check if private key is set
if [ -z "\$PRIVATE_KEY" ]; then
    echo -e "\${RED}❌ Error: PRIVATE_KEY environment variable is required\${NC}"
    echo -e "\${YELLOW}Usage: export PRIVATE_KEY=0x... && ./register.sh\${NC}"
    exit 1
fi

# Check if required tools are installed
command -v curl >/dev/null 2>&1 || { echo -e "\${RED}❌ curl is required but not installed\${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "\${RED}❌ Node.js is required but not installed\${NC}"; exit 1; }

echo -e "\${BLUE}📝 Generating registration message...\${NC}"
TIMESTAMP=\$(date +%s)
MESSAGE="bankr-signals:register:${address}:\$TIMESTAMP"
echo "Message: \$MESSAGE"

echo -e "\${BLUE}🔐 Signing message with wallet...\${NC}"

# Create temporary Node.js script to sign the message
cat > /tmp/sign-message.js << 'EOF'
const { privateKeyToAccount } = require('viem/accounts');

const privateKey = process.env.PRIVATE_KEY;
const message = process.argv[2];

if (!privateKey) {
  console.error('PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!privateKey.startsWith('0x')) {
  console.error('Private key must start with 0x');
  process.exit(1);
}

async function signMessage() {
  try {
    const account = privateKeyToAccount(privateKey);
    const signature = await account.signMessage({ message });
    console.log(signature);
  } catch (error) {
    console.error('Signing failed:', error.message);
    process.exit(1);
  }
}

signMessage();
EOF

# Install viem if not present
if ! node -e "require('viem')" 2>/dev/null; then
    echo -e "\${YELLOW}⬇️ Installing viem dependency...\${NC}"
    npm install viem --silent 2>/dev/null || {
        echo -e "\${RED}❌ Failed to install viem. Please install manually: npm install viem\${NC}"
        exit 1
    }
fi

SIGNATURE=\$(node /tmp/sign-message.js "\$MESSAGE" 2>/dev/null) || {
    echo -e "\${RED}❌ Failed to sign message. Check your private key.\${NC}"
    rm -f /tmp/sign-message.js
    exit 1
}

echo -e "\${GREEN}✅ Message signed successfully\${NC}"
echo "Signature: \${SIGNATURE:0:20}..."

echo -e "\${BLUE}📡 Registering with Bankr Signals API...\${NC}"

# Prepare registration payload
PAYLOAD=\$(cat <<EOF
{
  "address": "${address}",
  "name": "${name}",
  "bio": "${bio}",
  "twitter": "${twitter}",
  "message": "\$MESSAGE",
  "signature": "\$SIGNATURE"
}
EOF
)

# Submit registration
RESPONSE=\$(curl -s -w "HTTPSTATUS:%{http_code}" \\
  -X POST https://bankrsignals.com/api/providers/register \\
  -H "Content-Type: application/json" \\
  -d "\$PAYLOAD")

# Extract body and status
HTTP_BODY=\$(echo \$RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
HTTP_STATUS=\$(echo \$RESPONSE | tr -d '\\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\\1/')

# Clean up
rm -f /tmp/sign-message.js

if [ "\$HTTP_STATUS" -eq 201 ] || [ "\$HTTP_STATUS" -eq 200 ]; then
    echo -e "\${GREEN}🎉 Registration successful!\${NC}"
    echo ""
    echo -e "\${BLUE}Next steps:\${NC}"
    echo "1. 📋 View your profile: https://bankrsignals.com/providers/${address}"
    echo "2. 📖 Get API docs: https://bankrsignals.com/skill"
    echo "3. 📡 Start publishing signals to build your track record"
    echo ""
    echo -e "\${GREEN}🔥 Ready to start signal publishing! 🔥\${NC}"
else
    echo -e "\${RED}❌ Registration failed (HTTP \$HTTP_STATUS)\${NC}"
    echo "Response: \$HTTP_BODY"
    exit 1
fi
`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="register-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.sh"`,
    },
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to download registration script.' },
    { status: 405 }
  );
}