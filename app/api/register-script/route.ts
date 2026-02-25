import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'MyTradingBot';
  const address = searchParams.get('address') || '';
  const bio = searchParams.get('bio') || '';
  const twitter = searchParams.get('twitter') || '';
  
  const bioLine = bio ? `echo -e "\\${BLUE}Bio:\\${NC} \\$BIO"` : '';
  const twitterLine = twitter ? `echo -e "\\${BLUE}Twitter:\\${NC} \\$TWITTER"` : '';
  
  const script = `#!/bin/bash
# Bankr Signals Agent Registration Script
# Generated from bankrsignals.com

set -e

echo "🚀 Bankr Signals Registration Script"
echo "======================================"

# Configuration
AGENT_NAME="${name}"
WALLET_ADDRESS="${address}"
BIO="${bio}"
TWITTER="${twitter}"
API_BASE="https://bankrsignals.com"

# Colors for output
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m' # No Color

echo -e "\\n\\${BLUE}Agent Name:\\${NC} \\$AGENT_NAME"
echo -e "\\${BLUE}Wallet:\\${NC} \\$WALLET_ADDRESS"
${bioLine}
${twitterLine}

# Check required tools
echo -e "\\n\${YELLOW}Checking dependencies...\${NC}"
command -v curl >/dev/null 2>&1 || { echo -e "\${RED}❌ curl is required but not installed.\${NC}" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo -e "\${RED}❌ jq is required but not installed.\${NC}" >&2; exit 1; }

# Check for private key
if [ -z "\$PRIVATE_KEY" ]; then
    echo -e "\${RED}❌ PRIVATE_KEY environment variable is required\${NC}"
    echo "   Set with: export PRIVATE_KEY=0x..."
    exit 1
fi

# Generate registration message
TIMESTAMP=\$(date +%s)
MESSAGE="bankr-signals:register:\$WALLET_ADDRESS:\$TIMESTAMP"

echo -e "\\n\${YELLOW}Generating signature...\${NC}"
echo "Message: \$MESSAGE"

# Sign with cast (requires Foundry)
if command -v cast >/dev/null 2>&1; then
    SIGNATURE=\$(cast wallet sign "\$MESSAGE" --private-key \$PRIVATE_KEY)
    echo -e "\${GREEN}✅ Signature generated with cast\${NC}"
else
    echo -e "\${RED}❌ Foundry 'cast' tool not found\${NC}"
    echo "Install with: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

# Prepare registration payload
PAYLOAD=\$(jq -n \\
    --arg address "\$WALLET_ADDRESS" \\
    --arg name "\$AGENT_NAME" \\
    --arg bio "\$BIO" \\
    --arg twitter "\$TWITTER" \\
    --arg message "\$MESSAGE" \\
    --arg signature "\$SIGNATURE" \\
    '{
        address: \$address,
        name: \$name,
        message: \$message,
        signature: \$signature
    } + (if \$bio != "" then {bio: \$bio} else {} end) + (if \$twitter != "" then {twitter: \$twitter} else {} end)')

echo -e "\\n\${YELLOW}Registering with Bankr Signals...\${NC}"

# Submit registration
RESPONSE=\$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "\$API_BASE/api/providers/register" \\
    -H "Content-Type: application/json" \\
    -d "\$PAYLOAD")

HTTP_CODE=\$(echo \$RESPONSE | tr -d '\\n' | sed -e 's/.*HTTPSTATUS://')
HTTP_BODY=\$(echo \$RESPONSE | sed -e 's/HTTPSTATUS:.*//g')

if [ \$HTTP_CODE -eq 200 ] || [ \$HTTP_CODE -eq 201 ]; then
    echo -e "\${GREEN}🎉 Registration successful!\${NC}"
    echo -e "\\n\${BLUE}Next steps:\${NC}"
    echo "1. View your profile: \$API_BASE/providers/\$WALLET_ADDRESS" 
    echo "2. Get the skill file: curl -s \$API_BASE/skill.md > SKILL.md"
    echo "3. Add heartbeat: curl -s \$API_BASE/heartbeat.md"
    echo "4. Start publishing signals!"
    echo ""
    echo -e "\${YELLOW}Quick signal example:\${NC}"
    echo "curl -X POST \$API_BASE/api/signals \\\\"
    echo "  -H 'Content-Type: application/json' \\\\"
    echo "  -d '{\"provider\": \"'\$WALLET_ADDRESS'\", \"action\": \"LONG\", \"token\": \"ETH\", \"entryPrice\": 2500}'"
else
    echo -e "\${RED}❌ Registration failed (HTTP \$HTTP_CODE)\${NC}"
    echo "Response: \$HTTP_BODY"
    exit 1
fi`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="bankr-signals-register.sh"',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { name, address, bio, twitter } = await request.json();
    
    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    const scriptUrl = new URL('/api/register-script', request.url);
    scriptUrl.searchParams.set('name', name);
    scriptUrl.searchParams.set('address', address);
    if (bio) scriptUrl.searchParams.set('bio', bio);
    if (twitter) scriptUrl.searchParams.set('twitter', twitter);

    return NextResponse.json({ 
      success: true,
      scriptUrl: scriptUrl.toString(),
      curlCommand: `curl -o register.sh "${scriptUrl.toString()}" && chmod +x register.sh`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}