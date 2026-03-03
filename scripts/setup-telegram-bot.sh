#!/bin/bash

# Setup Telegram Bot for Bankr Signals
# This script sets up the Telegram bot webhooks and database

set -e

echo "🤖 Setting up Telegram Bot for Bankr Signals..."

# Check environment variables
if [[ -z "$TELEGRAM_BOT_TOKEN" ]]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN environment variable not set"
    echo "Get a token from @BotFather on Telegram and add it to your .env.local"
    exit 1
fi

if [[ -z "$NEXT_PUBLIC_BASE_URL" ]]; then
    echo "❌ Error: NEXT_PUBLIC_BASE_URL environment variable not set"
    echo "Set it to your domain (e.g., https://bankrsignals.com)"
    exit 1
fi

# Apply database migration
echo "📊 Applying database migration..."
if [[ -f "database/migrations/003_telegram_subscribers.sql" ]]; then
    echo "Running migration: 003_telegram_subscribers.sql"
    # Note: This requires manual execution in Supabase SQL editor
    # or proper database connection string
    echo "⚠️  Please run the SQL in database/migrations/003_telegram_subscribers.sql manually in Supabase"
else
    echo "❌ Migration file not found"
fi

# Set up Telegram webhook
echo "🔗 Setting up Telegram webhook..."
WEBHOOK_URL="$NEXT_PUBLIC_BASE_URL/api/telegram"

# Register Telegram bot webhook
response=$(curl -s -X GET "$NEXT_PUBLIC_BASE_URL/api/telegram?setup=webhook")
if echo "$response" | grep -q '"success":true'; then
    echo "✅ Telegram webhook registered successfully"
else
    echo "❌ Failed to register Telegram webhook"
    echo "$response"
fi

# Register signals webhook  
echo "📡 Registering for signal notifications..."
signals_response=$(curl -s -X GET "$NEXT_PUBLIC_BASE_URL/api/telegram?setup=signals_webhook")
if echo "$signals_response" | grep -q '"success":true'; then
    echo "✅ Signal notifications webhook registered"
else
    echo "❌ Failed to register signal notifications"
    echo "$signals_response"
fi

echo ""
echo "🎉 Telegram bot setup complete!"
echo ""
echo "Next steps:"
echo "1. Find your bot on Telegram: @your_bot_name"
echo "2. Send /start to activate it"
echo "3. Test with /subscribe to start receiving notifications"
echo ""
echo "Bot commands:"
echo "  /start - Welcome message"
echo "  /subscribe - Get all signal notifications"
echo "  /subscribe ETH BTC - Watch specific tokens"
echo "  /unsubscribe - Stop notifications"
echo "  /status - Check subscription"
echo "  /help - Show all commands"
echo ""
echo "For support, visit: https://bankrsignals.com"