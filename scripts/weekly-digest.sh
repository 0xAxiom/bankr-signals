#!/bin/bash
# Weekly Digest Automation Script
# Run this every Monday at 9 AM PT to send weekly digest emails

set -e

BASE_URL="${BASE_URL:-https://bankrsignals.com}"
DRY_RUN="${DRY_RUN:-false}"

echo "🔄 Running Weekly Digest..."
echo "Base URL: $BASE_URL"
echo "Dry Run: $DRY_RUN"

# Check if it's Monday (day 1 of the week)
CURRENT_DAY=$(date +%u)
if [[ "$CURRENT_DAY" != "1" && "$FORCE_RUN" != "true" ]]; then
    echo "⏰ Not Monday - skipping digest (use FORCE_RUN=true to override)"
    exit 0
fi

if [[ "$DRY_RUN" == "true" ]]; then
    echo "🧪 Dry run mode - no emails will be sent"
    curl -s "${BASE_URL}/api/cron/weekly-digest?dry-run=true" | jq '.'
else
    echo "📧 Sending weekly digest emails..."
    RESULT=$(curl -s "${BASE_URL}/api/cron/weekly-digest?execute=true")
    
    echo "$RESULT" | jq '.'
    
    # Extract metrics for logging
    SUBSCRIBERS=$(echo "$RESULT" | jq -r '.emailResults.subscribers // 0')
    SENT=$(echo "$RESULT" | jq -r '.emailResults.sent // 0')
    ERRORS=$(echo "$RESULT" | jq -r '.emailResults.errors // [] | length')
    
    echo "📊 Digest Results:"
    echo "  • Subscribers: $SUBSCRIBERS"
    echo "  • Emails sent: $SENT"
    echo "  • Errors: $ERRORS"
    
    if [[ "$ERRORS" -gt 0 ]]; then
        echo "⚠️  Some emails failed to send"
        exit 1
    fi
fi

echo "✅ Weekly digest completed successfully"