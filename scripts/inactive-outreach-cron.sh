#!/bin/bash

# Bankr Signals - Inactive Provider Outreach Cron
# Runs weekly to re-engage registered agents who haven't published signals

set -e

echo "🤖 Starting inactive provider outreach..."
echo "Time: $(date)"

# Get the cron secret from environment
if [[ -z "$CRON_SECRET" ]]; then
    echo "❌ CRON_SECRET not set"
    exit 1
fi

# API endpoint
API_URL="https://bankrsignals.com/api/outreach/inactive-followup"

echo "📊 Running dry-run to check inactive providers..."

# First run a dry run to see how many inactive providers we have
DRY_RUN_RESPONSE=$(curl -s -X POST "${API_URL}?dry-run=true" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json")

echo "Dry run response:"
echo "$DRY_RUN_RESPONSE" | jq .

# Extract inactive count
INACTIVE_COUNT=$(echo "$DRY_RUN_RESPONSE" | jq -r '.inactiveCount // 0')

echo "📈 Found $INACTIVE_COUNT inactive providers"

if [[ "$INACTIVE_COUNT" -eq 0 ]]; then
    echo "✅ No inactive providers to contact"
    exit 0
fi

# Ask for confirmation in interactive mode
if [[ "${INTERACTIVE:-false}" == "true" ]]; then
    echo ""
    echo "💬 Inactive providers to contact:"
    echo "$DRY_RUN_RESPONSE" | jq -r '.providers[]? | "  • \(.name) (\(.address)) - \(.daysSinceRegistration) days old"'
    echo ""
    read -p "Send follow-up messages to $INACTIVE_COUNT providers? (y/N): " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "❌ Outreach cancelled"
        exit 0
    fi
fi

echo "📧 Sending follow-up messages..."

# Run the actual outreach
RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq .

# Check for success
if echo "$RESPONSE" | jq -e '.message' > /dev/null; then
    echo "✅ Outreach campaign completed successfully"
    
    # Log the results
    TOTAL=$(echo "$RESPONSE" | jq -r '.totalProviders // 0')
    SUCCESS_COUNT=$(echo "$RESPONSE" | jq -r '.results | map(select(.result != "error")) | length')
    ERROR_COUNT=$(echo "$RESPONSE" | jq -r '.results | map(select(.result == "error")) | length')
    
    echo "📊 Summary:"
    echo "  Total providers: $TOTAL"
    echo "  Successful contacts: $SUCCESS_COUNT"
    echo "  Errors: $ERROR_COUNT"
    
    # Log errors if any
    if [[ "$ERROR_COUNT" -gt 0 ]]; then
        echo "⚠️ Errors:"
        echo "$RESPONSE" | jq -r '.results[] | select(.result == "error") | "  • \(.provider): \(.error)"'
    fi
    
else
    echo "❌ Outreach campaign failed"
    echo "$RESPONSE"
    exit 1
fi

echo "🎯 Next steps:"
echo "  1. Monitor for new signal publications from contacted agents"
echo "  2. Check for replies/engagement on social platforms"
echo "  3. Review manual outreach list for follow-up"

echo "✅ Inactive provider outreach completed at $(date)"