#!/bin/bash
# Weekly digest automation script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env.local"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Check if required environment variables are set
if [[ -z "$CRON_SECRET" ]]; then
    error "CRON_SECRET not set in environment"
    exit 1
fi

if [[ -z "$NEXT_PUBLIC_BASE_URL" ]]; then
    error "NEXT_PUBLIC_BASE_URL not set in environment"
    exit 1
fi

BASE_URL=${NEXT_PUBLIC_BASE_URL:-"https://bankrsignals.com"}

log "🚀 Starting weekly digest generation..."

# Generate the digest
log "📊 Generating digest data..."
DIGEST_URL="$BASE_URL/api/email-digest?secret=$CRON_SECRET"

# Use curl to generate the digest
RESPONSE=$(curl -s "$DIGEST_URL")
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DIGEST_URL")

if [[ "$STATUS_CODE" != "200" ]]; then
    error "Failed to generate digest. Status code: $STATUS_CODE"
    echo "Response: $RESPONSE"
    exit 1
fi

# Parse the response to check for success
if echo "$RESPONSE" | grep -q '"success":true'; then
    log "✅ Digest generated successfully"
    
    # Extract some stats from the response
    SIGNALS_COUNT=$(echo "$RESPONSE" | grep -o '"signalsCount":[0-9]*' | cut -d':' -f2)
    AVG_PNL=$(echo "$RESPONSE" | grep -o '"avgPnl":[0-9.-]*' | cut -d':' -f2)
    
    log "📈 Digest stats: $SIGNALS_COUNT signals, avg PnL: ${AVG_PNL}%"
    
    # TODO: Add actual email sending logic here
    # For now, just log that we would send emails
    warn "📧 Email sending not yet configured - digest ready for manual distribution"
    
    # Generate preview URL for manual testing
    PREVIEW_URL="$BASE_URL/api/email-digest?preview=true"
    log "🔍 Preview digest at: $PREVIEW_URL"
    
else
    error "Digest generation failed"
    echo "Response: $RESPONSE"
    exit 1
fi

log "🎉 Weekly digest process completed!"

# Example integration with email service (commented out)
# if [[ -n "$RESEND_API_KEY" ]]; then
#     log "📧 Sending digest emails..."
#     # Add subscriber email logic here
#     SUBSCRIBER_EMAILS='["user@example.com","user2@example.com"]'
#     
#     curl -X POST "$BASE_URL/api/email-digest" \
#         -H "Content-Type: application/json" \
#         -d "{\"emails\": $SUBSCRIBER_EMAILS, \"cronSecret\": \"$CRON_SECRET\"}"
# fi