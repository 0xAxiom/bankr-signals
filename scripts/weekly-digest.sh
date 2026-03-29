#!/bin/bash

# Weekly Digest Email Sender
# Fetches all active subscribers and sends them the weekly digest
# Run this via cron every Sunday at 9 AM: 0 9 * * 0 /path/to/weekly-digest.sh

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(cat "$PROJECT_ROOT/.env.local" | grep -v '^#' | xargs)
fi

# Configuration
BASE_URL="${NEXT_PUBLIC_BASE_URL:-https://bankrsignals.com}"
CRON_SECRET="${CRON_SECRET:-}"

# Check required environment variables
if [ -z "$CRON_SECRET" ]; then
    echo "❌ Error: CRON_SECRET not set in environment"
    exit 1
fi

if [ -z "$RESEND_API_KEY" ]; then
    echo "❌ Error: RESEND_API_KEY not set in environment"
    echo "💡 Set up Resend account and add RESEND_API_KEY to .env.local"
    exit 1
fi

# Function to fetch all active subscribers
fetch_subscribers() {
    echo "📧 Fetching active subscribers..."
    
    # Fetch subscriber emails via API
    local response=$(curl -s "$BASE_URL/api/subscribers?secret=$CRON_SECRET&format=emails")
    
    # Check if the response is valid JSON
    if ! echo "$response" | jq . >/dev/null 2>&1; then
        echo "❌ Invalid response from subscribers API:"
        echo "$response"
        return 1
    fi
    
    # Check if request was successful
    if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
        local subscriber_emails=$(echo "$response" | jq '.data')
        
        if [ "$subscriber_emails" = "null" ] || [ "$subscriber_emails" = "[]" ]; then
            echo "⚠️  No active subscribers found"
            return 1
        fi
        
        echo "$subscriber_emails"
        return 0
    else
        echo "❌ Failed to fetch subscribers:"
        echo "$response"
        return 1
    fi
}

# Function to send digest to all subscribers
send_digest() {
    local subscribers="$1"
    
    echo "🚀 Sending weekly digest to subscribers..."
    
    # Prepare JSON payload
    local payload=$(cat <<EOF
{
    "emails": $subscribers,
    "cronSecret": "$CRON_SECRET"
}
EOF
    )
    
    # Send POST request to email digest endpoint
    local response=$(curl -s -X POST "$BASE_URL/api/email-digest" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    echo "$response"
    
    # Check if successful
    if echo "$response" | grep -q '"success":true'; then
        local sent_count=$(echo "$response" | grep -o '"sent":[0-9]*' | cut -d: -f2)
        echo "✅ Successfully sent digest to $sent_count subscribers"
        return 0
    else
        echo "❌ Failed to send digest:"
        echo "$response"
        return 1
    fi
}

# Function to test digest generation
test_digest() {
    echo "🧪 Testing digest generation..."
    
    local response=$(curl -s "$BASE_URL/api/email-digest?secret=$CRON_SECRET")
    
    if echo "$response" | grep -q '"success":true'; then
        local signal_count=$(echo "$response" | grep -o '"signalsCount":[0-9]*' | cut -d: -f2)
        echo "✅ Digest generated successfully with $signal_count signals"
        return 0
    else
        echo "❌ Failed to generate digest:"
        echo "$response"
        return 1
    fi
}

# Main execution
main() {
    echo "📊 Starting Bankr Signals Weekly Digest Sender"
    echo "⏰ $(date)"
    echo "🌐 Base URL: $BASE_URL"
    echo ""
    
    # Test digest generation first
    if ! test_digest; then
        echo "❌ Digest generation failed. Aborting email send."
        exit 1
    fi
    
    echo ""
    
    # Fetch subscribers
    if ! subscribers=$(fetch_subscribers); then
        echo "❌ Failed to fetch subscribers. Aborting."
        exit 1
    fi
    
    local subscriber_count=$(echo "$subscribers" | jq '. | length' 2>/dev/null || echo "0")
    echo "👥 Found $subscriber_count active subscribers"
    
    if [ "$subscriber_count" = "0" ] || [ "$subscriber_count" = "null" ]; then
        echo "⚠️  No subscribers to send to. Exiting."
        exit 0
    fi
    
    echo ""
    
    # Send digest
    if send_digest "$subscribers"; then
        echo ""
        echo "🎉 Weekly digest sent successfully!"
        echo "📊 View digest at: $BASE_URL/weekly-digest"
        echo "⚙️  Admin panel: $BASE_URL/admin/digest"
    else
        echo ""
        echo "❌ Weekly digest sending failed!"
        exit 1
    fi
}

# Help function
show_help() {
    cat <<EOF
Bankr Signals Weekly Digest Sender

USAGE:
    $0 [COMMAND]

COMMANDS:
    send        Send digest to all subscribers (default)
    test        Test digest generation only
    preview     Open preview in browser
    help        Show this help

SETUP:
    1. Set CRON_SECRET and RESEND_API_KEY in .env.local
    2. Add to crontab: 0 9 * * 0 $0
    3. Test with: $0 test

ENVIRONMENT VARIABLES:
    CRON_SECRET         Secret for API authentication
    RESEND_API_KEY      Resend email service API key  
    DATABASE_URL        PostgreSQL connection string
    NEXT_PUBLIC_BASE_URL    Base URL (default: https://bankrsignals.com)

EOF
}

# Command handling
case "${1:-send}" in
    "send")
        main
        ;;
    "test")
        echo "🧪 Testing digest generation..."
        test_digest
        ;;
    "preview")
        echo "🔍 Opening digest preview..."
        open "$BASE_URL/api/email-digest?preview=true"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac