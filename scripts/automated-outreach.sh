#!/bin/bash

# Automated Agent Outreach Script
# Runs the automated outreach system to convert inactive providers to active ones
# Should be run via cron 1-2x daily

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🤖 Bankr Signals - Automated Agent Outreach"
echo "=============================================="
echo "Started at: $(date)"
echo ""

cd "$PROJECT_DIR"

# Check if site is accessible
if ! curl -s --max-time 10 https://bankrsignals.com/api/health > /dev/null; then
    echo "❌ Site not accessible. Skipping outreach."
    exit 1
fi

echo "✅ Site accessible"

# Run the automated outreach
echo "📤 Running automated outreach..."

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -w "\nHTTP_STATUS:%{http_code}" \
    https://bankrsignals.com/api/cron/automated-outreach)

# Extract response body and status code
HTTP_BODY=$(echo "$RESPONSE" | sed '$ d')
HTTP_STATUS=$(echo "$RESPONSE" | tail -1 | sed 's/HTTP_STATUS://')

echo "Response Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Automated outreach completed successfully"
    echo ""
    echo "Results:"
    echo "$HTTP_BODY" | jq -r '
        "📊 Processed: " + (.results.processed | tostring) + " providers",
        "📱 Twitter sent: " + (.results.twitter_sent | tostring),
        "🟣 Farcaster sent: " + (.results.farcaster_sent | tostring),
        "⏭️  Skipped: " + (.results.skipped | tostring),
        "❌ Errors: " + (.results.errors | length | tostring)
    '
    
    # Show errors if any
    ERROR_COUNT=$(echo "$HTTP_BODY" | jq -r '.results.errors | length')
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo ""
        echo "🚨 Errors encountered:"
        echo "$HTTP_BODY" | jq -r '.results.errors[]'
    fi
else
    echo "❌ Automated outreach failed"
    echo "Response: $HTTP_BODY"
    exit 1
fi

echo ""
echo "📈 Next steps:"
echo "1. Monitor provider activity for increased signal publishing"
echo "2. Check /monitor/inactive-providers for updated stats"
echo "3. Review outreach effectiveness in admin dashboard"
echo ""
echo "Completed at: $(date)"