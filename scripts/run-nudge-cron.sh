#!/bin/bash

# Bankr Signals - Automated Provider Nudge Cron
# Runs daily to nudge inactive providers

set -e

cd "$(dirname "$0")/.."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Add additional secrets from keychain if needed
if command -v security >/dev/null 2>&1; then
    export TWITTER_API_KEY=$(security find-generic-password -a axiom -s openclaw.TWITTER_API_KEY -w 2>/dev/null || echo "")
    export TWITTER_API_SECRET=$(security find-generic-password -a axiom -s openclaw.TWITTER_API_SECRET -w 2>/dev/null || echo "")
    export TWITTER_ACCESS_TOKEN=$(security find-generic-password -a axiom -s openclaw.TWITTER_ACCESS_TOKEN -w 2>/dev/null || echo "")
    export TWITTER_ACCESS_TOKEN_SECRET=$(security find-generic-password -a axiom -s openclaw.TWITTER_ACCESS_TOKEN_SECRET -w 2>/dev/null || echo "")
fi

echo "🤖 Starting Bankr Signals inactive provider nudge..."
echo "📅 $(date)"

# Run the nudge script
node --input-type=module scripts/nudge-inactive-providers.js

echo "✅ Nudge cron complete at $(date)"