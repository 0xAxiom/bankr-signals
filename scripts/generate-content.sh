#!/bin/bash
# Bankr Signals Content Generator
# Generates tweet-ready content from signal data

set -e

API_BASE="https://bankrsignals.com"
TYPE=${1:-auto}  # auto, signal_spotlight, performance_update, market_insight

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Bankr Signals Content Generator${NC}"
echo -e "${BLUE}====================================${NC}"

echo -e "\n${YELLOW}Fetching ${TYPE} content...${NC}"

# Get content from API
RESPONSE=$(curl -s "${API_BASE}/api/content/tweet-draft?type=${TYPE}")

# Check if successful
if ! echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${RED}❌ API error:${NC}"
    echo "$RESPONSE" | jq '.error // .'
    exit 1
fi

# Extract draft text
if [ "$TYPE" = "auto" ]; then
    DRAFT=$(echo "$RESPONSE" | jq -r '.data.draft.text // empty')
    DRAFT_TYPE=$(echo "$RESPONSE" | jq -r '.data.draft.type // empty')
    HASHTAGS=$(echo "$RESPONSE" | jq -r '.data.draft.hashtags // [] | join(" ")')
    URL=$(echo "$RESPONSE" | jq -r '.data.draft.url // empty')
else
    DRAFT=$(echo "$RESPONSE" | jq -r '.data.drafts[0].text // empty')
    DRAFT_TYPE=$(echo "$RESPONSE" | jq -r '.data.drafts[0].type // empty')
    HASHTAGS=$(echo "$RESPONSE" | jq -r '.data.drafts[0].hashtags // [] | join(" ")')
    URL=$(echo "$RESPONSE" | jq -r '.data.drafts[0].url // empty')
fi

if [ -z "$DRAFT" ] || [ "$DRAFT" = "null" ]; then
    echo -e "${YELLOW}⚠️  No content available for type: ${TYPE}${NC}"
    exit 0
fi

echo -e "\n${GREEN}✅ Generated ${DRAFT_TYPE} content:${NC}"
echo -e "\n${BLUE}Tweet Text:${NC}"
echo "─────────────"
echo "$DRAFT"
echo "─────────────"

echo -e "\n${BLUE}Hashtags:${NC} $HASHTAGS"
if [ -n "$URL" ] && [ "$URL" != "null" ]; then
    echo -e "${BLUE}URL:${NC} $URL"
fi

# Character count
CHAR_COUNT=$(echo -n "$DRAFT" | wc -c)
echo -e "\n${BLUE}Character count:${NC} $CHAR_COUNT/280"

if [ $CHAR_COUNT -gt 280 ]; then
    echo -e "${YELLOW}⚠️  Tweet exceeds 280 characters${NC}"
fi

# Save to file
OUTPUT_FILE="/tmp/bankr-tweet-$(date +%Y%m%d-%H%M%S).txt"
echo "$DRAFT" > "$OUTPUT_FILE"
echo -e "\n${GREEN}💾 Saved to: ${OUTPUT_FILE}${NC}"

# Option to post (if Twitter API is available)
if command -v ~/clawd/scripts/twitter.sh &> /dev/null; then
    echo -e "\n${YELLOW}Post to Twitter? [y/N]:${NC} "
    read -r POST_CONFIRM
    if [[ $POST_CONFIRM =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Posting to Twitter...${NC}"
        if ~/clawd/scripts/twitter.sh tweet "$DRAFT"; then
            echo -e "${GREEN}✅ Posted to Twitter!${NC}"
        else
            echo -e "${RED}❌ Failed to post to Twitter${NC}"
        fi
    fi
fi

echo -e "\n${GREEN}🎉 Content generation complete!${NC}"