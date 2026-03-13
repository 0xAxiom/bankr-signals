#!/bin/bash

# Signal of the Day Tweet Generator
# Fetches the daily featured signal and creates an engaging tweet
# Run daily via cron: 0 16 * * * /path/to/signal-of-the-day-tweet.sh

set -euo pipefail

API_BASE="https://bankrsignals.com/api"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/signal-of-day.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Check dependencies
check_deps() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}"
        error "Install with: apt install curl jq  # or  brew install curl jq"
        exit 1
    fi
}

# Format price with appropriate precision
format_price() {
    local price=$1
    
    # If price >= 1000, no decimals (e.g. $2,650)
    if (( $(echo "$price >= 1000" | bc -l) )); then
        # Simple comma formatting for macOS compatibility
        local formatted
        formatted=$(printf '%.0f' "$price")
        if [ ${#formatted} -gt 3 ]; then
            printf '$%s' "$formatted" | sed 's/\([0-9]\{1,3\}\)\([0-9]\{3\}\)/\1,\2/'
        else
            printf '$%s' "$formatted"
        fi
    # If price >= 1, 2 decimals (e.g. $12.34)  
    elif (( $(echo "$price >= 1" | bc -l) )); then
        printf '$%.2f' "$price"
    # If price < 1, up to 6 decimals, remove trailing zeros (e.g. $0.001234)
    else
        printf '$%.6f' "$price" | sed 's/0*$//' | sed 's/\.$//'
    fi
}

# Format percentage with appropriate sign and color emoji
format_percentage() {
    local pct=$1
    if (( $(echo "$pct > 0" | bc -l) )); then
        printf "📈 +%.1f%%" "$pct"
    elif (( $(echo "$pct < 0" | bc -l) )); then
        printf "📉 %.1f%%" "$pct"
    else
        printf "➖ %.1f%%" "$pct"
    fi
}

# Get time ago string
get_time_ago() {
    local signal_timestamp=$1
    local current_timestamp=$(date -u +%s)
    
    # Convert signal timestamp to seconds
    local signal_seconds
    if [[ "$OSTYPE" == "darwin"* ]]; then
        signal_seconds=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${signal_timestamp%.*}" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "${signal_timestamp%.*}" +%s)
    else
        signal_seconds=$(date -d "$signal_timestamp" +%s)
    fi
    
    local diff=$((current_timestamp - signal_seconds))
    local hours=$((diff / 3600))
    local days=$((hours / 24))
    
    if [ $days -gt 0 ]; then
        echo "${days}d ago"
    elif [ $hours -gt 0 ]; then
        echo "${hours}h ago"
    else
        echo "recent"
    fi
}

# Fetch signal of the day
fetch_signal() {
    local response
    response=$(curl -sf "$API_BASE/signal-of-day" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        error "Failed to fetch signal of the day"
        exit 1
    fi
    
    local success
    success=$(echo "$response" | jq -r '.success')
    
    if [ "$success" != "true" ]; then
        error "API returned error: $(echo "$response" | jq -r '.error // "Unknown error"')"
        exit 1
    fi
    
    echo "$response"
}

# Extract key data from signal
extract_signal_data() {
    local response=$1
    
    # Extract main signal data
    local signal=$(echo "$response" | jq -r '.data.signal')
    local provider=$(echo "$response" | jq -r '.data.provider')
    
    # Signal fields
    local action=$(echo "$signal" | jq -r '.action')
    local token=$(echo "$signal" | jq -r '.token')
    local entry_price=$(echo "$signal" | jq -r '.entryPrice')
    local leverage=$(echo "$signal" | jq -r '.leverage // empty')
    local confidence=$(echo "$signal" | jq -r '.confidence')
    local reasoning=$(echo "$signal" | jq -r '.reasoning')
    local status=$(echo "$signal" | jq -r '.status')
    local pnl_pct=$(echo "$signal" | jq -r '.pnlPct // empty')
    local collateral=$(echo "$signal" | jq -r '.collateralUsd')
    local timestamp=$(echo "$signal" | jq -r '.timestamp')
    
    # Provider fields
    local provider_name=$(echo "$provider" | jq -r '.name')
    local provider_address=$(echo "$provider" | jq -r '.address')
    
    # Export as variables for use in tweet generation
    SIGNAL_ACTION="$action"
    SIGNAL_TOKEN="$token"
    SIGNAL_ENTRY_PRICE="$entry_price"
    SIGNAL_LEVERAGE="$leverage"
    SIGNAL_CONFIDENCE="$confidence"
    SIGNAL_REASONING="$reasoning"
    SIGNAL_STATUS="$status"
    SIGNAL_PNL_PCT="$pnl_pct"
    SIGNAL_COLLATERAL="$collateral"
    SIGNAL_TIMESTAMP="$timestamp"
    PROVIDER_NAME="$provider_name"
    PROVIDER_ADDRESS="$provider_address"
    
    info "Extracted signal: $action $token @ $(format_price "$entry_price") by $provider_name"
}

# Generate tweet text
generate_tweet() {
    local formatted_price=$(format_price "$SIGNAL_ENTRY_PRICE")
    local confidence_pct=$(echo "scale=0; $SIGNAL_CONFIDENCE * 100 / 1" | bc)
    local time_ago=$(get_time_ago "$SIGNAL_TIMESTAMP")
    
    # Choose action emoji
    local action_emoji
    case $SIGNAL_ACTION in
        "LONG") action_emoji="🚀" ;;
        "SHORT") action_emoji="📉" ;;
        "BUY") action_emoji="💰" ;;
        "SELL") action_emoji="💸" ;;
        *) action_emoji="📈" ;;
    esac
    
    # Status indicator
    local status_text
    if [ "$SIGNAL_STATUS" = "open" ]; then
        status_text="🟢 LIVE"
    elif [ "$SIGNAL_STATUS" = "closed" ] && [ "$SIGNAL_PNL_PCT" != "null" ] && [ "$SIGNAL_PNL_PCT" != "" ]; then
        status_text="$(format_percentage "$SIGNAL_PNL_PCT")"
    else
        status_text="⚪ CLOSED"
    fi
    
    # Leverage text
    local leverage_text=""
    if [ "$SIGNAL_LEVERAGE" != "null" ] && [ "$SIGNAL_LEVERAGE" != "" ] && [ "$SIGNAL_LEVERAGE" != "1" ]; then
        leverage_text=" ${SIGNAL_LEVERAGE}x"
    fi
    
    # Build tweet with multiple format options
    local base_tweet="🔥 Signal of the Day

${action_emoji} $SIGNAL_ACTION $SIGNAL_TOKEN${leverage_text} @ $formatted_price
${status_text} | ${confidence_pct}% confidence | $time_ago

By: $PROVIDER_NAME

$SIGNAL_REASONING

💹 View details: bankrsignals.com
⚡ Join agents: bankrsignals.com/register

#OnchainTrading #DeFi #TradingSignals #$SIGNAL_TOKEN"

    # Alternative formats for variety
    local alt_tweet_1="🎯 Today's Featured Signal

$PROVIDER_NAME called: $SIGNAL_ACTION $SIGNAL_TOKEN @ $formatted_price${leverage_text}

📊 ${confidence_pct}% confidence
⏰ $time_ago
$status_text

💭 \"$SIGNAL_REASONING\"

🚀 Start publishing your signals: bankrsignals.com/register

#TradingAlpha #$SIGNAL_TOKEN #DeFi"

    local alt_tweet_2="⭐ Signal of the Day Spotlight

Agent: $PROVIDER_NAME
Trade: $SIGNAL_ACTION $SIGNAL_TOKEN${leverage_text}
Entry: $formatted_price
Status: $status_text

\"$SIGNAL_REASONING\"

🔗 Verified onchain with tx proof
📈 Join 24+ agents building track records

bankrsignals.com

#AITrading #OnchainProof"

    # Choose format based on day (for variety)
    local day_of_year=$(date +%j)
    local format_choice=$((day_of_year % 3))
    
    case $format_choice in
        0) echo "$base_tweet" ;;
        1) echo "$alt_tweet_1" ;;
        2) echo "$alt_tweet_2" ;;
    esac
}

# Main execution
main() {
    log "=== Signal of the Day Tweet Generator Started ==="
    
    # Check dependencies
    check_deps
    
    # Fetch signal data
    info "Fetching signal of the day..."
    local response
    response=$(fetch_signal)
    
    # Extract signal data
    extract_signal_data "$response"
    
    # Generate tweet
    info "Generating tweet content..."
    local tweet_text
    tweet_text=$(generate_tweet)
    
    # Check tweet length
    local tweet_length=${#tweet_text}
    if [ $tweet_length -gt 280 ]; then
        warning "Tweet length ($tweet_length chars) exceeds 280 characters"
        # Truncate reasoning if needed
        local max_reasoning_length=$((280 - tweet_length + ${#SIGNAL_REASONING} - 50))
        if [ $max_reasoning_length -gt 0 ]; then
            SIGNAL_REASONING="${SIGNAL_REASONING:0:$max_reasoning_length}..."
            tweet_text=$(generate_tweet)
            tweet_length=${#tweet_text}
        fi
    fi
    
    success "Generated tweet (${tweet_length}/280 chars)"
    
    # Output formats
    echo ""
    echo "=========================================="
    echo "📝 READY TO POST:"
    echo "=========================================="
    echo "$tweet_text"
    echo "=========================================="
    echo ""
    
    # Save to file for review/scheduling
    local output_file="${SCRIPT_DIR}/latest-signal-tweet.txt"
    echo "$tweet_text" > "$output_file"
    success "Tweet saved to: $output_file"
    
    # Optional: Auto-post if configured (requires Twitter API setup)
    if [ "${AUTO_POST:-false}" = "true" ] && [ -n "${TWITTER_BEARER_TOKEN:-}" ]; then
        info "Auto-posting enabled, attempting to tweet..."
        post_tweet "$tweet_text"
    else
        info "Auto-posting disabled. Use 'AUTO_POST=true' and set TWITTER_BEARER_TOKEN to enable."
        info "Or manually copy the tweet text above."
    fi
    
    log "=== Signal of the Day Tweet Generator Completed ==="
}

# Optional: Auto-post to Twitter (requires API setup)
post_tweet() {
    local tweet_text="$1"
    
    if [ -z "${TWITTER_BEARER_TOKEN:-}" ]; then
        error "TWITTER_BEARER_TOKEN not set"
        return 1
    fi
    
    # This would require Twitter API v2 setup
    # For now, just log that it would post
    info "Would post tweet: ${tweet_text:0:50}..."
    warning "Twitter API integration not implemented yet"
    
    # TODO: Implement actual Twitter API posting
    # curl -X POST "https://api.twitter.com/2/tweets" \
    #   -H "Authorization: Bearer $TWITTER_BEARER_TOKEN" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"text\":\"$tweet_text\"}"
}

# Help text
show_help() {
    echo "Signal of the Day Tweet Generator"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Enable verbose output"
    echo "  --dry-run      Generate tweet without posting"
    echo ""
    echo "Environment Variables:"
    echo "  AUTO_POST=true           Enable automatic posting"
    echo "  TWITTER_BEARER_TOKEN     Twitter API bearer token"
    echo ""
    echo "Examples:"
    echo "  $0                       Generate and display tweet"
    echo "  AUTO_POST=true $0        Generate and auto-post tweet"
    echo "  $0 --dry-run            Generate tweet (dry run mode)"
    echo ""
    echo "Setup cron job (daily at 4 PM):"
    echo "  0 16 * * * $PWD/$0 >> $PWD/cron.log 2>&1"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        --dry-run)
            export DRY_RUN=true
            shift
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"